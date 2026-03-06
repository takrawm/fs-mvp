import { describe, it, expect } from "vitest";
import {
  Account,
  AccountCode,
  AccountHierarchy,
} from "../account";
import {
  ConstantNode,
  AddNode,
  SubtractNode,
  MultiplyNode,
  ReferenceNode,
  FormulaNodeRefImpl,
} from "../computation/FormulaNode";
import type { FormulaNodeRef } from "../computation/FormulaNode";
import { GrowthRate, Money, Ratio } from "../money";
import { Period } from "../period";
import type { RuleBuildContext } from "./RuleBuildContext";
import { ManualInputRule } from "./ManualInputRule";
import { GrowthRateRule } from "./GrowthRateRule";
import { PercentageRule } from "./PercentageRule";
import { ReferenceRule } from "./ReferenceRule";
import { BalanceChangeRule } from "./BalanceChangeRule";
import { SumRule } from "./SumRule";
import { SubtractRule } from "./SubtractRule";

function createMockContext(
  hierarchy?: AccountHierarchy,
): RuleBuildContext {
  return {
    getNodeRef(accountCode: AccountCode, period: Period): FormulaNodeRef {
      return new FormulaNodeRefImpl(accountCode, period);
    },
    getHierarchy(): AccountHierarchy {
      return hierarchy!;
    },
  };
}

const period = Period.of(2024, 5);

describe("ManualInputRule", () => {
  it("builds a ConstantNode with the given value", () => {
    const rule = new ManualInputRule(AccountCode.of("sga"), Money.of(200));
    const node = rule.buildFormulaNode(period, createMockContext());

    expect(node).toBeInstanceOf(ConstantNode);
    expect(node.nodeId).toBe("sga:2024-05");
    expect(node.getDependencies()).toHaveLength(0);
  });

  it("has ruleType MANUAL_INPUT", () => {
    const rule = new ManualInputRule(AccountCode.of("sga"), Money.of(200));
    expect(rule.ruleType).toBe("MANUAL_INPUT");
  });
});

describe("GrowthRateRule", () => {
  it("builds a MultiplyNode referencing the previous period", () => {
    const rule = new GrowthRateRule(
      AccountCode.of("revenue"),
      GrowthRate.of(0.05),
    );
    const node = rule.buildFormulaNode(period, createMockContext());

    expect(node).toBeInstanceOf(MultiplyNode);
    expect(node.nodeId).toBe("revenue:2024-05");

    const deps = node.getDependencies();
    expect(deps).toHaveLength(1);
    expect(deps[0].accountCode.equals(AccountCode.of("revenue"))).toBe(true);
    expect(deps[0].period.equals(Period.of(2024, 4))).toBe(true);
  });

  it("has ruleType GROWTH_RATE", () => {
    const rule = new GrowthRateRule(
      AccountCode.of("revenue"),
      GrowthRate.of(0.05),
    );
    expect(rule.ruleType).toBe("GROWTH_RATE");
  });
});

describe("PercentageRule", () => {
  it("builds a MultiplyNode referencing the base account in the same period", () => {
    const rule = new PercentageRule(
      AccountCode.of("cogs"),
      AccountCode.of("revenue"),
      Ratio.of(0.7),
    );
    const node = rule.buildFormulaNode(period, createMockContext());

    expect(node).toBeInstanceOf(MultiplyNode);
    expect(node.nodeId).toBe("cogs:2024-05");

    const deps = node.getDependencies();
    expect(deps).toHaveLength(1);
    expect(deps[0].accountCode.equals(AccountCode.of("revenue"))).toBe(true);
    expect(deps[0].period.equals(period)).toBe(true);
  });

  it("has ruleType PERCENTAGE", () => {
    const rule = new PercentageRule(
      AccountCode.of("cogs"),
      AccountCode.of("revenue"),
      Ratio.of(0.7),
    );
    expect(rule.ruleType).toBe("PERCENTAGE");
  });
});

describe("ReferenceRule", () => {
  it("builds a ReferenceNode for the same period (offset=0)", () => {
    const rule = new ReferenceRule(
      AccountCode.of("target"),
      AccountCode.of("source"),
      0,
    );
    const node = rule.buildFormulaNode(period, createMockContext());

    expect(node).toBeInstanceOf(ReferenceNode);
    expect(node.nodeId).toBe("target:2024-05");

    const deps = node.getDependencies();
    expect(deps).toHaveLength(1);
    expect(deps[0].accountCode.equals(AccountCode.of("source"))).toBe(true);
    expect(deps[0].period.equals(period)).toBe(true);
  });

  it("builds a ReferenceNode for the previous period (offset=-1)", () => {
    const rule = new ReferenceRule(
      AccountCode.of("target"),
      AccountCode.of("source"),
      -1,
    );
    const node = rule.buildFormulaNode(period, createMockContext());

    const deps = node.getDependencies();
    expect(deps[0].period.equals(Period.of(2024, 4))).toBe(true);
  });

  it("has ruleType REFERENCE", () => {
    const rule = new ReferenceRule(
      AccountCode.of("target"),
      AccountCode.of("source"),
    );
    expect(rule.ruleType).toBe("REFERENCE");
  });
});

describe("BalanceChangeRule", () => {
  it("builds an AddNode with previous balance + change source", () => {
    const rule = new BalanceChangeRule(
      AccountCode.of("ar"),
      AccountCode.of("ar_change"),
    );
    const node = rule.buildFormulaNode(period, createMockContext());

    expect(node).toBeInstanceOf(AddNode);
    expect(node.nodeId).toBe("ar:2024-05");

    const deps = node.getDependencies();
    expect(deps).toHaveLength(2);
    // prev balance
    expect(deps[0].accountCode.equals(AccountCode.of("ar"))).toBe(true);
    expect(deps[0].period.equals(Period.of(2024, 4))).toBe(true);
    // change source
    expect(deps[1].accountCode.equals(AccountCode.of("ar_change"))).toBe(true);
    expect(deps[1].period.equals(period)).toBe(true);
  });

  it("has ruleType BALANCE_CHANGE", () => {
    const rule = new BalanceChangeRule(
      AccountCode.of("ar"),
      AccountCode.of("ar_change"),
    );
    expect(rule.ruleType).toBe("BALANCE_CHANGE");
  });
});

describe("SumRule", () => {
  it("builds an AddNode with all children from hierarchy", () => {
    const accounts = [
      Account.create({
        code: "total",
        name: "合計",
        type: "PL",
        side: "CREDIT",
        parentCode: null,
        sortOrder: 1,
        isStructural: true,
      }),
      Account.create({
        code: "child1",
        name: "子1",
        type: "PL",
        side: "CREDIT",
        parentCode: "total",
        sortOrder: 2,
      }),
      Account.create({
        code: "child2",
        name: "子2",
        type: "PL",
        side: "CREDIT",
        parentCode: "total",
        sortOrder: 3,
      }),
    ];
    const hierarchy = AccountHierarchy.build(accounts);
    const context = createMockContext(hierarchy);

    const rule = new SumRule(AccountCode.of("total"));
    const node = rule.buildFormulaNode(period, context);

    expect(node).toBeInstanceOf(AddNode);
    expect(node.nodeId).toBe("total:2024-05");

    const deps = node.getDependencies();
    expect(deps).toHaveLength(2);
    expect(deps[0].accountCode.equals(AccountCode.of("child1"))).toBe(true);
    expect(deps[1].accountCode.equals(AccountCode.of("child2"))).toBe(true);
  });

  it("has ruleType SUM", () => {
    const rule = new SumRule(AccountCode.of("total"));
    expect(rule.ruleType).toBe("SUM");
  });
});

describe("SubtractRule", () => {
  it("builds a SubtractNode with minuend and subtrahend", () => {
    const rule = new SubtractRule(
      AccountCode.of("gross_profit"),
      AccountCode.of("revenue"),
      AccountCode.of("cogs"),
    );
    const node = rule.buildFormulaNode(period, createMockContext());

    expect(node).toBeInstanceOf(SubtractNode);
    expect(node.nodeId).toBe("gross_profit:2024-05");

    const deps = node.getDependencies();
    expect(deps).toHaveLength(2);
    expect(deps[0].accountCode.equals(AccountCode.of("revenue"))).toBe(true);
    expect(deps[1].accountCode.equals(AccountCode.of("cogs"))).toBe(true);
  });

  it("has ruleType SUBTRACT", () => {
    const rule = new SubtractRule(
      AccountCode.of("gross_profit"),
      AccountCode.of("revenue"),
      AccountCode.of("cogs"),
    );
    expect(rule.ruleType).toBe("SUBTRACT");
  });
});
