import { LoggingService } from "src/logging/logging.service"
import { MockerUtils } from "src/utils/MockerUtils"
import { BaseExampleRule, ExampleResolutionContext, ExampleResolutionResult } from "./rules.type"

/**
 * Rule that checks for multiple defined examples.
 * It looks for the 'examples' property and extracts all example values and their names.
 */
export class MultipleExamplesRule extends BaseExampleRule {

  public static setLoggingService(loggingService: LoggingService) {
    MultipleExamplesRule.loggingService = loggingService
    MultipleExamplesRule.loggingService.setContext("MultipleExamplesRule")
  }

  protected async process(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
    try {
      if (MultipleExamplesRule.loggingService) {
        MultipleExamplesRule.loggingService.debug("Processing context for multiple examples", null, {
          operationId: context.operation?.operationId,
          path: context.operation?.path,
          method: context.operation?.method,
        })
      }

      const content = context.responseDefinition?.content?.["application/json"]
      if (content && content.examples) {
        const examples: any[] = []
        const exampleNames: string[] = []

        if (MultipleExamplesRule.loggingService) {
          MultipleExamplesRule.loggingService.debug("Found examples object", null, {
            exampleCount: Object.keys(content.examples).length,
            operationId: context.operation?.operationId,
          })
        }

        // Iterate over each example defined in the examples object.
        for (const key in content.examples) {
          if (content.examples.hasOwnProperty(key)) {
            try {
              let value = content.examples[key]
              // If the example is defined via a $ref, resolve it.
              if (value.$ref) {
                if (MultipleExamplesRule.loggingService) {
                  MultipleExamplesRule.loggingService.debug(`Resolving reference for example "${key}": ${value.$ref}`)
                }

                value = MockerUtils.resolveRef(value.$ref, context.openapi)
                // Some references wrap the value in a 'value' property.
                if (value && value.value) {
                  value = value.value
                }
              } else if (value.value) {
                // If it's an object with a 'value' property, use that.
                value = value.value
              }

              examples.push(value)
              exampleNames.push(key)

              if (MultipleExamplesRule.loggingService) {
                MultipleExamplesRule.loggingService.debug(`Processed example "${key}"`)
              }
            } catch (exampleError) {
              if (MultipleExamplesRule.loggingService) {
                MultipleExamplesRule.loggingService.error(
                  `Error processing example "${key}": ${exampleError.message}`,
                  exampleError.stack,
                )
              }
              // Continue with other examples
            }
          }
        }

        if (examples.length > 0) {
          if (MultipleExamplesRule.loggingService) {
            MultipleExamplesRule.loggingService.debug("Successfully processed multiple examples", null, {
              exampleCount: examples.length,
              exampleNames,
            })
          }

          return {
            examples,
            exampleNames,
          }
        }
      }

      if (MultipleExamplesRule.loggingService) {
        MultipleExamplesRule.loggingService.debug("No multiple examples found, delegating to next rule", null, {
          operationId: context.operation?.operationId,
        })
      }

      return null
    } catch (error) {
      if (MultipleExamplesRule.loggingService) {
        MultipleExamplesRule.loggingService.error(`Error processing multiple examples: ${error.message}`, error.stack, null, {
          operationId: context.operation?.operationId,
          path: context.operation?.path,
          method: context.operation?.method,
        })
      }
      return null // Continue to next rule on error
    }
  }
}
