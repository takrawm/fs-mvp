import type { AccountCode } from "../account";
import type { FormulaNode } from "../computation/FormulaNode";
import type { Period } from "../period";
import type { RuleBuildContext } from "./RuleBuildContext";

export type RuleType =
  | "MANUAL_INPUT"
  | "GROWTH_RATE"
  | "PERCENTAGE"
  | "REFERENCE"
  | "BALANCE_CHANGE"
  | "SUM"
  | "SUBTRACT";

export interface Rule {
  readonly accountCode: AccountCode;
  readonly ruleType: RuleType;
  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode;
}
