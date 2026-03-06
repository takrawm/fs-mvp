import type { AccountCode } from "../account";
import type { FormulaNode } from "../computation/FormulaNode";
import { ReferenceNode } from "../computation/FormulaNode";
import { NodeRegistry } from "../computation/NodeRegistry";
import type { Period } from "../period";
import type { Rule, RuleType } from "./Rule";
import type { RuleBuildContext } from "./RuleBuildContext";

export class ReferenceRule implements Rule {
  readonly ruleType: RuleType = "REFERENCE";

  constructor(
    readonly accountCode: AccountCode,
    private readonly referenceAccount: AccountCode,
    private readonly referencePeriodOffset: number = 0,
  ) {
    Object.freeze(this);
  }

  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    let targetPeriod = period;
    for (let i = 0; i < Math.abs(this.referencePeriodOffset); i++) {
      targetPeriod =
        this.referencePeriodOffset < 0
          ? targetPeriod.prev()
          : targetPeriod.next();
    }
    const ref = context.getNodeRef(this.referenceAccount, targetPeriod);
    return new ReferenceNode(nodeId, ref);
  }
}
