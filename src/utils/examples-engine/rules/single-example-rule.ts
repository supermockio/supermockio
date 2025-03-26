import { BaseExampleRule, type ExampleResolutionContext, type ExampleResolutionResult } from "./rules.type"
import { MockerUtils } from "src/utils/MockerUtils"
import { LoggingService } from "src/logging/logging.service"

/**
 * Rule that checks for a single defined example.
 * It looks for the 'example' property in the response content.
 */
export class SingleExampleRule extends BaseExampleRule {
  public static setLoggingService(loggingService: LoggingService) {
    SingleExampleRule.loggingService = loggingService
    SingleExampleRule.loggingService.setContext("SingleExampleRule")
  }

  protected async process(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
    try {
      if (SingleExampleRule.loggingService) {
        SingleExampleRule.loggingService.debug("Processing context for single example", null, {
          operationId: context.operation?.operationId,
          path: context.operation?.path,
          method: context.operation?.method,
        })
      }

      const content = context.responseDefinition?.content?.["application/json"]
      if (content && content.example) {
        // Found a single example. Return it as a one-element array.
        if (SingleExampleRule.loggingService) {
          SingleExampleRule.loggingService.debug("Found single example", null, {
            operationId: context.operation?.operationId,
          })
        }

        return {
          examples: [content.example],
          exampleNames: ["default"],
        }
      }

      if (SingleExampleRule.loggingService) {
        SingleExampleRule.loggingService.debug("No single example found, delegating to next rule", null, {
          operationId: context.operation?.operationId,
        })
      }

      return null
    } catch (error) {
      if (SingleExampleRule.loggingService) {
        SingleExampleRule.loggingService.error(`Error processing single example: ${error.message}`, error.stack, null, {
          operationId: context.operation?.operationId,
          path: context.operation?.path,
          method: context.operation?.method,
        })
      }
      return null // Continue to next rule on error
    }
  }
}


