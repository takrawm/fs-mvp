import type { AccountCode } from "../account";
import type { FormulaNode } from "../computation/FormulaNode";
import { MultiplyNode } from "../computation/FormulaNode";
import { NodeRegistry } from "../computation/NodeRegistry";
import type { GrowthRate } from "../money";
import type { Period } from "../period";
import type { Rule, RuleType } from "./Rule";
import type { RuleBuildContext } from "./RuleBuildContext";

export class GrowthRateRule implements Rule {
  readonly ruleType: RuleType = "GROWTH_RATE";

  constructor(
    readonly accountCode: AccountCode,
    private readonly growthRate: GrowthRate,
  ) {
    Object.freeze(this);
  }

  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    const prevRef = context.getNodeRef(this.accountCode, period.prev());
    return new MultiplyNode(nodeId, prevRef, 1 + this.growthRate.rate);
  }
}
