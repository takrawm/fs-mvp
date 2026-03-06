import type { AccountCode } from "../account";
import type { FormulaNode } from "../computation/FormulaNode";
import { AddNode } from "../computation/FormulaNode";
import { NodeRegistry } from "../computation/NodeRegistry";
import type { Period } from "../period";
import type { Rule, RuleType } from "./Rule";
import type { RuleBuildContext } from "./RuleBuildContext";

export class SumRule implements Rule {
  readonly ruleType: RuleType = "SUM";

  constructor(readonly accountCode: AccountCode) {
    Object.freeze(this);
  }

  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    const hierarchy = context.getHierarchy();
    const children = hierarchy.getChildren(this.accountCode);
    const childRefs = children.map((child) =>
      context.getNodeRef(child.code, period),
    );
    return new AddNode(nodeId, childRefs);
  }
}
