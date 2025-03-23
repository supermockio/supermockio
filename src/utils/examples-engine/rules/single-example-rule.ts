// concrete-example-rules.ts

import { BaseExampleRule, ExampleResolutionContext, ExampleResolutionResult } from './rules.type';
import { MockerUtils } from 'src/utils/MockerUtils';

/**
 * Rule that checks for a single defined example.
 * It looks for the 'example' property in the response content.
 */
export class SingleExampleRule extends BaseExampleRule {
  protected async process(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
    const content = context.responseDefinition?.content?.['application/json'];
    if (content && content.example) {
      // Found a single example. Return it as a one-element array.
      return {
        examples: [content.example],
        exampleNames: ['default']
      };
    }
    return null;
  }
}

/**
 * Rule that checks for multiple defined examples.
 * It looks for the 'examples' property and extracts all example values and their names.
 */
export class MultipleExamplesRule extends BaseExampleRule {
  protected async process(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
    const content = context.responseDefinition?.content?.['application/json'];
    if (content && content.examples) {
      const examples: any[] = [];
      const exampleNames: string[] = [];
      
      // Iterate over each example defined in the examples object.
      for (const key in content.examples) {
        if (content.examples.hasOwnProperty(key)) {
          let value = content.examples[key];
          // If the example is defined via a $ref, resolve it.
          if (value.$ref) {
            value = MockerUtils.resolveRef(value.$ref, context.openapi);
            // Some references wrap the value in a 'value' property.
            if (value && value.value) {
              value = value.value;
            }
          } else if (value.value) {
            // If it's an object with a 'value' property, use that.
            value = value.value;
          }
          examples.push(value);
          exampleNames.push(key);
        }
      }
      if (examples.length > 0) {
        return {
          examples,
          exampleNames
        };
      }
    }
    return null;
  }
}

/**
 * Fallback rule that uses AI generation to generate an example.
 * This rule is always the last in the chain.
 */
export class AIGenerationRule extends BaseExampleRule {
  protected async process(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
    const content = context.responseDefinition?.content?.['application/json'];
    if (content && content.schema) {
      try {
        // Always use AI generation if we reach this rule.
        const aiExample = await MockerUtils.generateExampleWithAI(content.schema, context.openapi, context.operation);
        return {
          examples: [aiExample],
          exampleNames: ['aiGenerated']
        };
      } catch (error) {
        console.error("AI Generation failed:", error);
        // Optionally, return a fallback empty object.
        return {
          examples: [{}],
          exampleNames: ['fallback']
        };
      }
    }
    // If no schema is provided, fallback with an empty example.
    return {
      examples: [{}],
      exampleNames: ['fallback']
    };
  }
}
