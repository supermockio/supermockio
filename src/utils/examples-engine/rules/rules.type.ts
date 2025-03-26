import { LoggingService } from "src/logging/logging.service"

/**
 * The context that will be passed to each example resolution rule.
 */
export interface ExampleResolutionContext {
  /**
   * The OpenAPI response definition for a specific response code.
   * This typically contains properties like `content`, which in turn may include
   * an `example`, an `examples` object, or a `schema` for fallback generation.
   */
  responseDefinition: any

  /**
   * The full OpenAPI document.
   * This is needed for resolving any references (i.e., `$ref`) and to provide additional context.
   */
  openapi: any

  /**
   * (Optional) Additional metadata, such as the operation details (path, method, etc.)
   */
  operation?: any
}

/**
 * The result of resolving an example.
 * It contains the example(s) and optionally the example names.
 */
export interface ExampleResolutionResult {
  // The resolved example content. For multiple examples, this array will contain each one.
  examples: any[]
  // Optionally, an array of example names (this may be used for the Response model update)
  exampleNames?: string[]
}

/**
 * The interface that all example resolution rules must implement.
 */
export interface IExampleRule {
  /**
   * Sets the next rule in the chain.
   */
  setNext(rule: IExampleRule): IExampleRule
  /**
   * Attempts to handle the given context.
   * Returns a result if the rule applies, or null otherwise.
   */
  handle(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null>
}

/**
 * An abstract base class for example resolution rules.
 * It implements the chain logic: if a rule doesn't produce a result,
 * it passes the context to the next rule.
 */
export abstract class BaseExampleRule implements IExampleRule {
  private nextRule: IExampleRule
  protected static loggingService: LoggingService

  public setNext(rule: IExampleRule): IExampleRule {
    this.nextRule = rule
    return rule
  }

  public async handle(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
    try {
      if (BaseExampleRule.loggingService) {
        BaseExampleRule.loggingService.debug(`${this.constructor.name}: Processing context`, null, {
          operationId: context.operation?.operationId,
          path: context.operation?.path,
          method: context.operation?.method,
        })
      }

      const result = await this.process(context)

      if (result !== null) {
        // If the current rule produced a result, return it and break the chain.
        if (BaseExampleRule.loggingService) {
          BaseExampleRule.loggingService.debug(`${this.constructor.name}: Rule produced a result`, null, {
            exampleCount: result.examples.length,
            exampleNames: result.exampleNames,
          })
        }
        return result
      }

      // Otherwise, delegate to the next rule if it exists.
      if (this.nextRule) {
        if (BaseExampleRule.loggingService) {
          BaseExampleRule.loggingService.debug(
            `${this.constructor.name}: Delegating to next rule: ${this.nextRule.constructor.name}`,
          )
        }
        return this.nextRule.handle(context)
      }

      if (BaseExampleRule.loggingService) {
        BaseExampleRule.loggingService.warn(`${this.constructor.name}: No next rule and no result produced`)
      }
      return null
    } catch (error) {
      if (BaseExampleRule.loggingService) {
        BaseExampleRule.loggingService.error(
          `${this.constructor.name}: Error handling context: ${error.message}`,
          error.stack, null,
          {
            operationId: context.operation?.operationId,
            path: context.operation?.path,
            method: context.operation?.method,
          },
        )
      }

      // On error, try the next rule if it exists
      if (this.nextRule) {
        if (BaseExampleRule.loggingService) {
          BaseExampleRule.loggingService.debug(
            `${this.constructor.name}: Error occurred, delegating to next rule: ${this.nextRule.constructor.name}`,
          )
        }
        return this.nextRule.handle(context)
      }

      // If this is the last rule, return a fallback
      return {
        examples: [{}],
        exampleNames: ["fallback-error"],
      }
    }
  }

  /**
   * Process the context to try to resolve an example.
   * Return a valid ExampleResolutionResult if successful, or null if not.
   */
  protected abstract process(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null>

  public static setLoggingService(loggingService: LoggingService) {
    BaseExampleRule.loggingService = loggingService
  }
}

