import type { AccountCode } from "../account";
import type { FormulaNode } from "../computation/FormulaNode";
import { MultiplyNode } from "../computation/FormulaNode";
import { NodeRegistry } from "../computation/NodeRegistry";
import type { Ratio } from "../money";
import type { Period } from "../period";
import type { Rule, RuleType } from "./Rule";
import type { RuleBuildContext } from "./RuleBuildContext";

export class PercentageRule implements Rule {
  readonly ruleType: RuleType = "PERCENTAGE";

  constructor(
    readonly accountCode: AccountCode,
    private readonly referenceAccount: AccountCode,
    private readonly ratio: Ratio,
  ) {
    Object.freeze(this);
  }

  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    const baseRef = context.getNodeRef(this.referenceAccount, period);
    return new MultiplyNode(nodeId, baseRef, this.ratio.value);
  }
}
