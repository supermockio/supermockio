// Updated MockerUtils.ts
import { faker } from '@faker-js/faker';
import { randomInt } from 'crypto';
import { GeminiService } from 'src/services/GeminiService';
import { AIServiceHandler } from './AIServiceHandler';



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
                    parameters[index] = MockerUtils.resolveRef(p['$ref'], openapi)
                }
            })
            return parameters.filter(param => param.in == "path").map((param) => new Parameter(param.name, param.schema, param['example']))
        }
        else return []
    }
}

export class MockerUtils {
    // Cache for resolved $ref values to improve performance
    private static refCache = {};

    public static resolveRef(refString: string, rootDoc: any): any {
        if (this.refCache[refString]) {
            return this.refCache[refString];
        }
        const path = refString.split('/');
        path.shift(); // Remove the leading "#"
        let currentObject = rootDoc;
        for (const key of path) {
            currentObject = currentObject[key];
            if (!currentObject) {
                throw new Error(`Failed to resolve reference: ${refString}`);
            }
        }
        this.refCache[refString] = currentObject;
        return currentObject;
    }

    public static resolveRefs(obj: any, rootDoc: any): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj; // Base case: not an object
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.resolveRefs(item, rootDoc));
        }
        const resolvedObj = {};
        for (const key in obj) {
            const value = obj[key];
            if (key === "$ref") {
                Object.assign(resolvedObj, this.resolveRefs(this.resolveRef(value, rootDoc), rootDoc));
            } else {
                resolvedObj[key] = this.resolveRefs(value, rootDoc);
            }
        }
        return resolvedObj;
    }

    public static fetchDefinedExample(examples: any, openapi: any): any {
        const firstKey = Object.keys(examples)[0];
        const firstExample = examples[firstKey];
        return (Object.keys(firstExample).includes("$ref"))
            ? this.resolveRef(firstExample["$ref"], openapi)["value"]
            : firstExample;
    }

    public static async generateExampleWithAI(schema: any, openapi: any, operation?: any): Promise<any> {
        if (!schema) return {};
        const aiService = AIServiceHandler.getAIService();
        const resolvedSchema = this.resolveRefs(schema, openapi);
    
        // Extract API context from the OpenAPI document (e.g. title and description)
        const apiTitle = openapi.info?.title || 'API';
        const apiDescription = openapi.info?.description || '';
    
        // Extract the operation description, if available
        const operationDescription = operation?.description || '';
    
        // Build a prompt that includes both the API and operation context
        const prompt = `I want to generate an OpenAPI response example for an endpoint of the "${apiTitle}".
    Please generate an example that fits the context of this API.
    API Description: ${apiDescription}
    Operation Description: ${operationDescription}
    Do not add any attributes that are not defined in the schema below.
    Here is the schema definition:
    ${JSON.stringify(resolvedSchema, null, 4)}
    Provide only the generated example as response.`;
    
        try {
            return await aiService.ask(prompt);
        } catch (error) {
            throw error;
        }
    }
    

    public static async generatePathWithAi(path: string, param: any, openapi: any): Promise<any> {
        param.schema = Object.keys(param.schema).includes("$ref")
            ? this.resolveRef(param.schema["$ref"], openapi)
            : param.schema;
        const aiService = new GeminiService();
        const prompt = `I want you to generate an example value for my path param: ${param.name} used in this OpenAPI path: ${path}. Return only the generated value.`;
        return await aiService.ask(prompt);
    }

    // Helper to generate realistic values for known formats
    private static getFakerValueForFormat(schema: any): any {
        switch (schema.format) {
            case 'date-time':
                return faker.date.recent().toISOString();
            case 'email':
                return faker.internet.email();
            case 'url':
                return faker.internet.url();
            case 'uuid':
                return faker.string.uuid();
            default:
                return null;
        }
    }

    public static generateExample(schema: any, openapi: any): any {
        if (!schema) return {};
        schema = Object.keys(schema).includes("$ref")
            ? this.resolveRef(schema["$ref"], openapi)
            : schema;

        // If a specific format is provided, use it to generate a realistic value.
        if (schema.format) {
            const formatValue = this.getFakerValueForFormat(schema);
            if (formatValue !== null) return formatValue;
        }

        if (Object.keys(schema).includes("allOf")) {
            return this.generateAllOfExample(schema["allOf"], openapi);
        }
        if (Object.keys(schema).includes("oneOf")) {
            const randomIndex = randomInt(schema["oneOf"].length);
            return this.generateExample(schema["oneOf"][randomIndex], openapi);
        }
        // Handle schema types
        switch (schema.type) {
            case 'string':
                return schema.enum ? schema.enum[0] : faker.person.firstName();
            case 'number':
                return schema.enum ? schema.enum[0] : faker.number.float() * 10;
            case 'integer':
                return schema.enum ? schema.enum[0] : faker.number.int();
            case 'boolean':
                return schema.enum ? schema.enum[0] : faker.datatype.boolean();
            case 'array':
                return this.generateArrayExample(schema.items, openapi);
            case 'object':
                return Object.assign(
                    {},
                    schema.properties ? this.generateObjectExample(schema.properties, openapi) : {},
                    schema["additionalProperties"] ? this.generateExample(schema["additionalProperties"], openapi) : {}
                );
            default:
                console.log(schema);
                throw new Error(`Unsupported schema type: ${schema.type}`);
        }
    }

    public static generateAllOfExample(allOfSchema: any[], openapi: any): any {
        const resultExample = {};
        allOfSchema.forEach(element => {
            Object.assign(resultExample, this.generateExample(element, openapi));
        });
        return resultExample;
    }

    public static generateArrayExample(itemSchema: any, openapi: any): any {
        const exampleArray = [];
        for (let i = 0; i < 3; i++) {
            exampleArray.push(this.generateExample(itemSchema, openapi));
        }
        return exampleArray;
    }

    public static generateObjectExample(properties: any, openapi: any): any {
        const exampleObject = {};
        for (const [key, propSchema] of Object.entries(properties)) {
            exampleObject[key] = this.generateExample(propSchema, openapi);
        }
        return exampleObject;
    }

    public static async generatePath(path: string, parameters: any[], openapi: any): Promise<string> {
        if (!parameters.length) return path;
        const pathArray = path.split("/");
        for (let index = 0; index < pathArray.length; index++) {
            const part = pathArray[index];
            if (part.startsWith('{') && part.endsWith('}')) {
                const param = parameters.filter(param => param.name === part.slice(1, -1))[0];
                if (param.example)
                    pathArray[index] = param.example;
                else if (param.schema["default"])
                    pathArray[index] = param.schema["default"];
                else if (process.env['AI_GENERATION_ENABLED'] === "true")
                    pathArray[index] = await this.generatePathWithAi(path, param, openapi);
                else
                    pathArray[index] = this.generateExample(param.schema, openapi);
            }
        }
        return pathArray.join("/");
    }
}
