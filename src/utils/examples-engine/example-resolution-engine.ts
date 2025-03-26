import { IExampleRule, ExampleResolutionContext, ExampleResolutionResult } from "./rules/rules.type"
import { SingleExampleRule } from "./rules/single-example-rule"
import { MultipleExamplesRule } from "./rules/multi-examples-rule"
import { AIGenerationRule } from "./rules/ai-rule"
import { LoggingService } from "src/logging/logging.service"
import { Injectable } from "@nestjs/common"

/**
 * The engine that runs the chain of responsibility.
 * It accepts an ordered set of rules and processes the given context.
 * The AI generation rule should always be the last in the chain.
 */
@Injectable()
class ExampleResolutionEngine {
  private chain: IExampleRule
  private static loggingService: LoggingService

  constructor(rules: IExampleRule[], loggingService?: LoggingService) {
    if (loggingService) {
      ExampleResolutionEngine.loggingService = loggingService
      ExampleResolutionEngine.loggingService.setContext("ExampleResolutionEngine")
    }

    // It is assumed that the rules are provided in the order they should be executed.
    // Ensure that the last rule is the AI generation rule.
    rules.forEach((rule, index) => {
      if (index === rules.length - 1) {
        rule.setNext(null)
      } else {
        rule.setNext(rules[index + 1])
      }
    })

    this.chain = rules[0]

    if (ExampleResolutionEngine.loggingService) {
      ExampleResolutionEngine.loggingService.debug("Example resolution engine initialized with rules", null, {
        ruleCount: rules.length,
        rules: rules.map((r) => r.constructor.name),
      })
    }
  }

  /**
   * Runs the chain of rules until one rule returns a successful result.
   */
  public async resolve(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
    try {
      if (!this.chain) {
        if (ExampleResolutionEngine.loggingService) {
          ExampleResolutionEngine.loggingService.warn("No rules in the chain")
        }
        return null
      }

      if (ExampleResolutionEngine.loggingService) {
        ExampleResolutionEngine.loggingService.debug("Starting rule chain execution", null, {
          operationId: context.operation?.operationId,
          path: context.operation?.path,
          method: context.operation?.method,
        })
      }

      // Start the chain with the first rule.
      const result = await this.chain.handle(context)

      if (ExampleResolutionEngine.loggingService) {
        if (result) {
          ExampleResolutionEngine.loggingService.debug("Rule chain execution completed successfully", null, {
            exampleCount: result.examples.length,
            exampleNames: result.exampleNames,
          })
        } else {
          ExampleResolutionEngine.loggingService.warn("Rule chain execution completed with no result")
        }
      }

      return result
    } catch (error) {
      if (ExampleResolutionEngine.loggingService) {
        ExampleResolutionEngine.loggingService.error(
          `Error in example resolution engine: ${error.message}`,
          error.stack, null,
          {
            operationId: context.operation?.operationId,
            path: context.operation?.path,
            method: context.operation?.method,
          },
        )
      }

      // Return a fallback empty result
      return {
        examples: [{}],
        exampleNames: ["fallback-error"],
      }
    }
  }

  public static setLoggingService(loggingService: LoggingService) {
    ExampleResolutionEngine.loggingService = loggingService
    ExampleResolutionEngine.loggingService.setContext("ExampleResolutionEngine")
  }
}

// Create the logging service instance for the engine
let engineLoggingService: LoggingService

// Function to set the logging service
export function setEngineLoggingService(loggingService: LoggingService) {
  engineLoggingService = loggingService
  ExampleResolutionEngine.setLoggingService(loggingService)
  SingleExampleRule.setLoggingService(loggingService)
  MultipleExamplesRule.setLoggingService(loggingService)
  AIGenerationRule.setLoggingService(loggingService)
}

// Build the chain-of-responsibility engine.
export const engine = new ExampleResolutionEngine([
  new SingleExampleRule(),
  new MultipleExamplesRule(),
  new AIGenerationRule(), // This rule is always last.
])

