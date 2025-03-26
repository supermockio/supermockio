import { LoggingService } from "src/logging/logging.service"
import { MockerUtils } from "src/utils/MockerUtils"
import { BaseExampleRule, ExampleResolutionContext, ExampleResolutionResult } from "./rules.type"

/**
 * Fallback rule that uses AI generation to generate an example.
 * This rule is always the last in the chain.
 */
export class AIGenerationRule extends BaseExampleRule {
  

    public static setLoggingService(loggingService: LoggingService) {
      AIGenerationRule.loggingService = loggingService
      AIGenerationRule.loggingService.setContext("AIGenerationRule")
    }
  
    protected async process(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
      try {
        if (AIGenerationRule.loggingService) {
          AIGenerationRule.loggingService.debug("Processing context for AI generation", null, {
            operationId: context.operation?.operationId,
            path: context.operation?.path,
            method: context.operation?.method,
          })
        }
  
        const content = context.responseDefinition?.content?.["application/json"]
        if (content && content.schema) {
          try {
            if (AIGenerationRule.loggingService) {
              AIGenerationRule.loggingService.debug("Attempting to generate example with AI", null, {
                operationId: context.operation?.operationId,
                schemaType: content.schema.type,
              })
            }
  
            // Check if AI generation is enabled
            if (process.env["AI_GENERATION_ENABLED"] !== "true") {
              if (AIGenerationRule.loggingService) {
                AIGenerationRule.loggingService.warn("AI generation is disabled, using empty object", null, {
                  operationId: context.operation?.operationId,
                })
              }
  
              return {
                examples: [{}],
                exampleNames: ["fallback-ai-disabled"],
              }
            }
  
            // Always use AI generation if we reach this rule.
            const aiExample = await MockerUtils.generateExampleWithAI(content.schema, context.openapi, context.operation)
  
            if (AIGenerationRule.loggingService) {
              AIGenerationRule.loggingService.debug("Successfully generated example with AI", null, {
                operationId: context.operation?.operationId,
              })
            }
  
            return {
              examples: [aiExample],
              exampleNames: ["aiGenerated"],
            }
          } catch (aiError) {
            if (AIGenerationRule.loggingService) {
              AIGenerationRule.loggingService.error(`AI Generation failed: ${aiError.message}`, aiError.stack, null, {
                operationId: context.operation?.operationId,
                path: context.operation?.path,
                method: context.operation?.method,
              })
            }
  
            // Return a fallback empty object.
            return {
              examples: [{}],
              exampleNames: ["fallback-ai-error"],
            }
          }
        }
  
        // If no schema is provided, fallback with an empty example.
        if (AIGenerationRule.loggingService) {
          AIGenerationRule.loggingService.warn("No schema provided for AI generation, using empty object", null, {
            operationId: context.operation?.operationId,
          })
        }
  
        return {
          examples: [{}],
          exampleNames: ["fallback-no-schema"],
        }
      } catch (error) {
        if (AIGenerationRule.loggingService) {
          AIGenerationRule.loggingService.error(`Error in AI generation rule: ${error.message}`, error.stack, null, {
            operationId: context.operation?.operationId,
            path: context.operation?.path,
            method: context.operation?.method,
          })
        }
  
        // Return a fallback empty object
        return {
          examples: [{}],
          exampleNames: ["fallback-error"],
        }
      }
    }
  }