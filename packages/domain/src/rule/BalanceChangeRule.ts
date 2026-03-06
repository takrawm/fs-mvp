import type { AccountCode } from "../account";
import type { FormulaNode } from "../computation/FormulaNode";
import { AddNode } from "../computation/FormulaNode";
import { NodeRegistry } from "../computation/NodeRegistry";
import type { Period } from "../period";
import type { Rule, RuleType } from "./Rule";
import type { RuleBuildContext } from "./RuleBuildContext";

export class BalanceChangeRule implements Rule {
  readonly ruleType: RuleType = "BALANCE_CHANGE";

  constructor(
    readonly accountCode: AccountCode,
    private readonly changeSourceAccount: AccountCode,
  ) {
    Object.freeze(this);
  }

  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    const prevBalanceRef = context.getNodeRef(this.accountCode, period.prev());
    const changeRef = context.getNodeRef(this.changeSourceAccount, period);
    return new AddNode(nodeId, [prevBalanceRef, changeRef]);
  }
}
