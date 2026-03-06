import type { AccountCode, AccountHierarchy } from "../account";
import type { FormulaNodeRef } from "../computation/FormulaNode";
import type { Period } from "../period";

export interface RuleBuildContext {
  getNodeRef(accountCode: AccountCode, period: Period): FormulaNodeRef;
  getHierarchy(): AccountHierarchy;
}
