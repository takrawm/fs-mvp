import type { AccountCode } from "../account";
import type { FormulaNode } from "../computation/FormulaNode";
import { SubtractNode } from "../computation/FormulaNode";
import { NodeRegistry } from "../computation/NodeRegistry";
import type { Period } from "../period";
import type { Rule, RuleType } from "./Rule";
import type { RuleBuildContext } from "./RuleBuildContext";

export class SubtractRule implements Rule {
  readonly ruleType: RuleType = "SUBTRACT";

  constructor(
    readonly accountCode: AccountCode,
    private readonly minuend: AccountCode,
    private readonly subtrahend: AccountCode,
  ) {
    Object.freeze(this);
  }

  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    const minuendRef = context.getNodeRef(this.minuend, period);
    const subtrahendRef = context.getNodeRef(this.subtrahend, period);
    return new SubtractNode(nodeId, minuendRef, subtrahendRef);
  }
}
