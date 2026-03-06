import type { AccountCode, AccountHierarchy } from "../account";
import type { Money } from "../money";
import type { Period } from "../period";
import type { Periods } from "../period";
import type { Rule } from "../rule/Rule";
import type { RuleBuildContext } from "../rule/RuleBuildContext";
import { EvaluationCache } from "./EvaluationCache";
import { ConstantNode, FormulaNodeRefImpl } from "./FormulaNode";
import type { FormulaNodeRef } from "./FormulaNode";
import { DependencyGraph } from "./DependencyGraph";
import { NodeRegistry } from "./NodeRegistry";

export interface ComputationError {
  readonly accountCode: AccountCode;
  readonly period: Period;
  readonly message: string;
}

export interface ComputationResult {
  readonly values: ReadonlyMap<string, Money>;
  readonly errors: readonly ComputationError[];
}

export class AstEngine {
  private readonly registry: NodeRegistry;
  private readonly cache: EvaluationCache;

  private constructor() {
    this.registry = new NodeRegistry();
    this.cache = new EvaluationCache();
  }

  static create(): AstEngine {
    return new AstEngine();
  }

  registerRules(params: {
    actuals: ReadonlyMap<string, Money>;
    rules: readonly Rule[];
    periods: Periods;
    hierarchy: AccountHierarchy;
  }): void {
    const { actuals, rules, periods, hierarchy } = params;
    const context = this.createBuildContext(hierarchy);

    // Register actual values as ConstantNodes
    // actuals map is keyed by nodeId format: "accountCode:yyyy-mm"
    for (const [nodeId, value] of actuals) {
      if (!this.registry.has(nodeId)) {
        this.registry.register(new ConstantNode(nodeId, value));
      }
    }

    // Register forecast period nodes from rules
    for (const period of periods.getForecasts()) {
      for (const rule of rules) {
        const nodeId = NodeRegistry.buildNodeId(rule.accountCode, period);
        if (!this.registry.has(nodeId)) {
          const node = rule.buildFormulaNode(period, context);
          this.registry.register(node);
        }
      }
    }
  }

  compute(): ComputationResult {
    this.cache.clear();
    const errors: ComputationError[] = [];

    const graph = DependencyGraph.build(this.registry);
    const cycle = graph.detectCycle();
    if (cycle !== null) {
      // Extract account codes from cycle node IDs
      for (const nodeId of cycle) {
        const [accountCode, periodKey] = nodeId.split(":");
        if (accountCode && periodKey) {
          const [yearStr, monthStr] = periodKey.split("-");
          errors.push({
            accountCode: { value: accountCode } as AccountCode,
            period: { fiscalYear: Number(yearStr), month: Number(monthStr) } as Period,
            message: `Circular dependency detected involving ${nodeId}`,
          });
        }
      }
      return { values: new Map(), errors };
    }

    const sorted = graph.topologicalSort();
    for (const node of sorted) {
      try {
        node.evaluate(this.cache);
      } catch (e) {
        const [accountCode, periodKey] = node.nodeId.split(":");
        if (accountCode && periodKey) {
          const [yearStr, monthStr] = periodKey.split("-");
          errors.push({
            accountCode: { value: accountCode } as AccountCode,
            period: { fiscalYear: Number(yearStr), month: Number(monthStr) } as Period,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    const values = new Map<string, Money>();
    for (const node of this.registry.getAll()) {
      const cached = this.cache.get(node.nodeId);
      if (cached !== undefined) {
        values.set(node.nodeId, cached);
      }
    }

    return { values, errors };
  }

  getValue(accountCode: AccountCode, period: Period): Money | undefined {
    const nodeId = NodeRegistry.buildNodeId(accountCode, period);
    return this.cache.get(nodeId);
  }

  private createBuildContext(hierarchy: AccountHierarchy): RuleBuildContext {
    return {
      getNodeRef: (
        accountCode: AccountCode,
        period: Period,
      ): FormulaNodeRef => {
        return new FormulaNodeRefImpl(accountCode, period);
      },
      getHierarchy: () => hierarchy,
    };
  }
}
