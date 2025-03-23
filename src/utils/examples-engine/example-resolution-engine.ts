import { IExampleRule, ExampleResolutionContext, ExampleResolutionResult } from "./rules/rules.type";
import { SingleExampleRule, MultipleExamplesRule, AIGenerationRule } from "./rules/single-example-rule";

/**
 * The engine that runs the chain of responsibility.
 * It accepts an ordered set of rules and processes the given context.
 * The AI generation rule should always be the last in the chain.
 */
class ExampleResolutionEngine {
    private chain: IExampleRule;

    constructor(rules: IExampleRule[]) {
        // It is assumed that the rules are provided in the order they should be executed.
        // Ensure that the last rule is the AI generation rule.
        rules.forEach((rule, index) => {
            if (index === rules.length - 1) {
                rule.setNext(null);
            } else {
                rule.setNext(rules[index + 1]);
            }
        })
        this.chain = rules[0];
    }

    /**
     * Runs the chain of rules until one rule returns a successful result.
     */
    public async resolve(context: ExampleResolutionContext): Promise<ExampleResolutionResult | null> {
        if (! this.chain) {
            return null;
        }
        // Start the chain with the first rule.
        return this.chain.handle(context);
    }
}
// Build the chain-of-responsibility engine.
export const engine = new ExampleResolutionEngine([
  new SingleExampleRule(),
  new MultipleExamplesRule(),
  new AIGenerationRule() // This rule is always last.
]);

