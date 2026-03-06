import type { AccountCode } from "../account";
import { ConstantNode } from "../computation/FormulaNode";
import type { FormulaNode } from "../computation/FormulaNode";
import { NodeRegistry } from "../computation/NodeRegistry";
import type { Money } from "../money";
import type { Period } from "../period";
import type { Rule, RuleType } from "./Rule";
import type { RuleBuildContext } from "./RuleBuildContext";

export class ManualInputRule implements Rule {
  readonly ruleType: RuleType = "MANUAL_INPUT";

  constructor(
    readonly accountCode: AccountCode,
    private readonly value: Money,
  ) {
    Object.freeze(this);
  }

  buildFormulaNode(period: Period, _context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    return new ConstantNode(nodeId, this.value);
  }
}
