import { faker } from "@faker-js/faker"
import { randomInt } from "crypto"
import { GeminiService } from "src/services/GeminiService"
import { AIServiceHandler } from "./AIServiceHandler"
import { LoggingService } from "src/logging/logging.service"
import { Injectable } from "@nestjs/common"

export class Parameter {
  name: string
  schema: object
  example: any

  constructor(name: string, schema: object, example: any) {
    this.name = name
    this.schema = schema
    this.example = example
  }

  public static arrayFrom(parameters: any[], openapi: object) {
    if (parameters) {
      parameters.forEach((p, index) => {
        if (Object.keys(p).includes("$ref")) {
          parameters[index] = MockerUtils.resolveRef(p["$ref"], openapi)
        }
      })
      return parameters
        .filter((param) => param.in == "path")
        .map((param) => new Parameter(param.name, param.schema, param["example"]))
    } else return []
  }
}

@Injectable()
export class MockerUtils {
  // Cache for resolved $ref values to improve performance
  private static refCache = {}
  private static loggingService: LoggingService

  constructor(loggingService: LoggingService) {
    MockerUtils.loggingService = loggingService
    MockerUtils.loggingService.setContext("MockerUtils")
  }

  private static log(level: "log" | "error" | "warn" | "debug", message: string, metadata?: any) {
    if (MockerUtils.loggingService) {
      MockerUtils.loggingService[level](message, "MockerUtils", metadata)
    }
  }

  public static resolveRef(refString: string, rootDoc: any): any {
    try {
      if (this.refCache[refString]) {
        return this.refCache[refString]
      }

      this.log("debug", `Resolving reference: ${refString}`)

      const path = refString.split("/")
      path.shift() // Remove the leading "#"
      let currentObject = rootDoc

      for (const key of path) {
        currentObject = currentObject[key]
        if (!currentObject) {
          const error = `Failed to resolve reference: ${refString}`
          this.log("error", error)
          throw new Error(error)
        }
      }

      this.refCache[refString] = currentObject
      return currentObject
    } catch (error) {
      this.log("error", `Error resolving reference: ${refString}`, { error: error.message })
      throw error
    }
  }

  public static resolveRefs(obj: any, rootDoc: any): any {
    try {
      if (typeof obj !== "object" || obj === null) {
        return obj // Base case: not an object
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => this.resolveRefs(item, rootDoc))
      }

      const resolvedObj = {}
      for (const key in obj) {
        const value = obj[key]
        if (key === "$ref") {
          Object.assign(resolvedObj, this.resolveRefs(this.resolveRef(value, rootDoc), rootDoc))
        } else {
          resolvedObj[key] = this.resolveRefs(value, rootDoc)
        }
      }

      return resolvedObj
    } catch (error) {
      this.log("error", `Error resolving references`, { error: error.message })
      throw error
    }
  }

  public static fetchDefinedExample(examples: any, openapi: any): any {
    try {
      this.log("debug", "Fetching defined example")

      const firstKey = Object.keys(examples)[0]
      const firstExample = examples[firstKey]

      return Object.keys(firstExample).includes("$ref")
        ? this.resolveRef(firstExample["$ref"], openapi)["value"]
        : firstExample
    } catch (error) {
      this.log("error", `Error fetching defined example`, { error: error.message })
      throw error
    }
  }

  public static async generateExampleWithAI(schema: any, openapi: any, operation?: any): Promise<any> {
    try {
      if (!schema) {
        this.log("warn", "No schema provided for AI generation, returning empty object")
        return {}
      }

      this.log("debug", "Generating example with AI", {
        operationId: operation?.operationId,
        path: operation?.path,
        method: operation?.method,
      })

      const aiService = AIServiceHandler.getAIService()
      const resolvedSchema = this.resolveRefs(schema, openapi)

      // Extract API context from the OpenAPI document
      const apiTitle = openapi.info?.title || "API"
      const apiDescription = openapi.info?.description || ""
      const operationDescription = operation?.description || ""

      // Build the prompt
      const prompt = `I want to generate an OpenAPI response example for an endpoint of the "${apiTitle}".
        Please generate an example that fits the context of this API.
        API Description: ${apiDescription}
        Operation Description: ${operationDescription}
        Do not add any attributes that are not defined in the schema below.
        Here is the schema definition:
        ${JSON.stringify(resolvedSchema, null, 4)}
        Provide only the generated example as response.`

      this.log("debug", "Sending prompt to AI service")
      const result = await aiService.ask(prompt)
      this.log("debug", "Received AI-generated example")

      return result
    } catch (error) {
      this.log("error", `AI example generation failed`, {
        error: error.message,
        operationId: operation?.operationId,
        path: operation?.path,
        method: operation?.method,
      })

      // Return a fallback empty object instead of throwing
      return {}
    }
  }

  public static async generatePathWithAi(path: string, param: any, openapi: any): Promise<any> {
    try {
      this.log("debug", `Generating path parameter value with AI`, {
        path,
        paramName: param.name,
      })

      param.schema = Object.keys(param.schema).includes("$ref")
        ? this.resolveRef(param.schema["$ref"], openapi)
        : param.schema

      const aiService = new GeminiService();
      const prompt = `I want you to generate an example value for my path param: ${param.name} used in this OpenAPI path: ${path}. Return only the generated value.`

      const result = await aiService.ask(prompt)
      this.log("debug", `Generated path parameter value with AI`, {
        path,
        paramName: param.name,
        value: result,
      })

      return result
    } catch (error) {
      this.log("error", `Failed to generate path parameter with AI`, {
        error: error.message,
        path,
        paramName: param.name,
      })

      // Fallback to a simple string value
      return `example-${param.name}`
    }
  }

  // Helper to generate realistic values for known formats
  private static getFakerValueForFormat(schema: any): any {
    try {
      switch (schema.format) {
        case "date-time":
          return faker.date.recent().toISOString()
        case "email":
          return faker.internet.email()
        case "url":
          return faker.internet.url()
        case "uuid":
          return faker.string.uuid()
        default:
          return null
      }
    } catch (error) {
      this.log("error", `Error generating faker value for format: ${schema.format}`, { error: error.message })
      return null
    }
  }

  public static generateExample(schema: any, openapi: any): any {
    try {
      if (!schema) {
        this.log("warn", "No schema provided for example generation, returning empty object")
        return {}
      }

      schema = Object.keys(schema).includes("$ref") ? this.resolveRef(schema["$ref"], openapi) : schema

      // If a specific format is provided, use it to generate a realistic value.
      if (schema.format) {
        const formatValue = this.getFakerValueForFormat(schema)
        if (formatValue !== null) return formatValue
      }

      if (Object.keys(schema).includes("allOf")) {
        return this.generateAllOfExample(schema["allOf"], openapi)
      }
      if (Object.keys(schema).includes("oneOf")) {
        const randomIndex = randomInt(schema["oneOf"].length)
        return this.generateExample(schema["oneOf"][randomIndex], openapi)
      }

      // Handle schema types
      switch (schema.type) {
        case "string":
          return schema.enum ? schema.enum[0] : faker.person.firstName()
        case "number":
          return schema.enum ? schema.enum[0] : faker.number.float() * 10
        case "integer":
          return schema.enum ? schema.enum[0] : faker.number.int()
        case "boolean":
          return schema.enum ? schema.enum[0] : faker.datatype.boolean()
        case "array":
          return this.generateArrayExample(schema.items, openapi)
        case "object":
          return Object.assign(
            {},
            schema.properties ? this.generateObjectExample(schema.properties, openapi) : {},
            schema["additionalProperties"] ? this.generateExample(schema["additionalProperties"], openapi) : {},
          )
        default:
          this.log("warn", `Unsupported schema type: ${schema.type}, returning empty object`)
          return {}
      }
    } catch (error) {
      this.log("error", `Error generating example`, {
        error: error.message,
        schemaType: schema?.type,
      })

      // Return empty object as fallback
      return {}
    }
  }

  public static generateAllOfExample(allOfSchema: any[], openapi: any): any {
    try {
      const resultExample = {}
      allOfSchema.forEach((element) => {
        Object.assign(resultExample, this.generateExample(element, openapi))
      })
      return resultExample
    } catch (error) {
      this.log("error", `Error generating allOf example`, { error: error.message })
      return {}
    }
  }

  public static generateArrayExample(itemSchema: any, openapi: any): any {
    try {
      const exampleArray = []
      for (let i = 0; i < 3; i++) {
        exampleArray.push(this.generateExample(itemSchema, openapi))
      }
      return exampleArray
    } catch (error) {
      this.log("error", `Error generating array example`, { error: error.message })
      return []
    }
  }

  public static generateObjectExample(properties: any, openapi: any): any {
    try {
      const exampleObject = {}
      for (const [key, propSchema] of Object.entries(properties)) {
        exampleObject[key] = this.generateExample(propSchema, openapi)
      }
      return exampleObject
    } catch (error) {
      this.log("error", `Error generating object example`, { error: error.message })
      return {}
    }
  }

  public static async generatePath(path: string, parameters: any[], openapi: any): Promise<string> {
    try {
      if (!parameters.length) return path

      this.log("debug", `Generating path with parameters`, {
        path,
        parameterCount: parameters.length,
      })

      const pathArray = path.split("/")
      for (let index = 0; index < pathArray.length; index++) {
        const part = pathArray[index]
        if (part.startsWith("{") && part.endsWith("}")) {
          const paramName = part.slice(1, -1)
          const param = parameters.filter((param) => param.name === paramName)[0]

          if (!param) {
            this.log("warn", `Parameter ${paramName} not found in parameters list`)
            continue
          }

          this.log("debug", `Generating value for path parameter: ${paramName}`)

          if (param.example) {
            pathArray[index] = param.example
            this.log("debug", `Using example value for ${paramName}: ${param.example}`)
          } else if (param.schema["default"]) {
            pathArray[index] = param.schema["default"]
            this.log("debug", `Using default value for ${paramName}: ${param.schema["default"]}`)
          } else if (process.env["AI_GENERATION_ENABLED"] === "true") {
            pathArray[index] = await this.generatePathWithAi(path, param, openapi)
            this.log("debug", `Using AI-generated value for ${paramName}: ${pathArray[index]}`)
          } else {
            pathArray[index] = this.generateExample(param.schema, openapi)
            this.log("debug", `Using generated value for ${paramName}: ${pathArray[index]}`)
          }
        }
      }

      const generatedPath = pathArray.join("/")
      this.log("debug", `Generated path: ${generatedPath}`)

      return generatedPath
    } catch (error) {
      this.log("error", `Error generating path`, {
        error: error.message,
        path,
      })

      // Return original path as fallback
      return path
    }
  }
}

