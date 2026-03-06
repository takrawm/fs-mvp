import { describe, it, expect } from "vitest";
import { Account, AccountCode, AccountHierarchy } from "../account";
import { GrowthRate, Money, Ratio } from "../money";
import { FiscalYearSetting, Period, Periods } from "../period";
import { GrowthRateRule } from "../rule/GrowthRateRule";
import { ManualInputRule } from "../rule/ManualInputRule";
import { PercentageRule } from "../rule/PercentageRule";
import { SubtractRule } from "../rule/SubtractRule";
import type { Rule } from "../rule/Rule";
import { AstEngine } from "./AstEngine";
import { NodeRegistry } from "./NodeRegistry";

// Helper: build a simple 5-account hierarchy
function buildTestHierarchy(): AccountHierarchy {
  return AccountHierarchy.build([
    Account.create({
      code: "revenue",
      name: "売上高",
      type: "PL",
      side: "CREDIT",
      parentCode: null,
      sortOrder: 1,
    }),
    Account.create({
      code: "cogs",
      name: "売上原価",
      type: "PL",
      side: "DEBIT",
      parentCode: null,
      sortOrder: 2,
    }),
    Account.create({
      code: "gross_profit",
      name: "売上総利益",
      type: "PL",
      side: "CREDIT",
      parentCode: null,
      sortOrder: 3,
    }),
    Account.create({
      code: "sga",
      name: "販管費",
      type: "PL",
      side: "DEBIT",
      parentCode: null,
      sortOrder: 4,
    }),
    Account.create({
      code: "operating_profit",
      name: "営業利益",
      type: "PL",
      side: "CREDIT",
      parentCode: null,
      sortOrder: 5,
    }),
  ]);
}

// Helper: FY2024 with 3月決算, 1 actual year, 1 forecast year
// Actual months: FY2024 (April 2024 - March 2025)
// Forecast months: FY2025 (April 2025 - March 2026)
function buildTestSetting(): FiscalYearSetting {
  return FiscalYearSetting.of({
    fiscalYearEndMonth: 3,
    actualPeriodCount: 1,
    forecastPeriodCount: 1,
    startFiscalYear: 2024,
  });
}

function buildActuals(
  accountCodes: string[],
  periods: readonly Period[],
  values: Record<string, number>,
): ReadonlyMap<string, Money> {
  const map = new Map<string, Money>();
  for (const period of periods) {
    for (const code of accountCodes) {
      const nodeId = `${code}:${period.toKey()}`;
      if (values[code] !== undefined) {
        map.set(nodeId, Money.of(values[code]));
      }
    }
  }
  return map;
}

describe("AstEngine", () => {
  it("computes forecast values for a simple 5-account model", () => {
    const hierarchy = buildTestHierarchy();
    const setting = buildTestSetting();
    const periods = Periods.generate(setting);
    const actualPeriods = periods.getActuals();

    // Actual values for all 12 months of FY2024
    const actuals = buildActuals(
      ["revenue", "cogs", "gross_profit", "sga", "operating_profit"],
      actualPeriods,
      {
        revenue: 1000,
        cogs: 700,
        gross_profit: 300,
        sga: 200,
        operating_profit: 100,
      },
    );

    // Forecast rules
    const rules: Rule[] = [
      new GrowthRateRule(AccountCode.of("revenue"), GrowthRate.of(0.05)),
      new PercentageRule(
        AccountCode.of("cogs"),
        AccountCode.of("revenue"),
        Ratio.of(0.7),
      ),
      new SubtractRule(
        AccountCode.of("gross_profit"),
        AccountCode.of("revenue"),
        AccountCode.of("cogs"),
      ),
      new ManualInputRule(AccountCode.of("sga"), Money.of(200)),
      new SubtractRule(
        AccountCode.of("operating_profit"),
        AccountCode.of("gross_profit"),
        AccountCode.of("sga"),
      ),
    ];

    const engine = AstEngine.create();
    engine.registerRules({ actuals, rules, periods, hierarchy });
    const result = engine.compute();

    expect(result.errors).toHaveLength(0);

    // The first forecast month adjacent to actuals is FY2025/1
    // (prev of 2025/1 is 2024/12 which is the last actual month)
    const forecastPeriod = Period.of(2025, 1);
    const revenue = engine.getValue(
      AccountCode.of("revenue"),
      forecastPeriod,
    );
    const cogs = engine.getValue(AccountCode.of("cogs"), forecastPeriod);
    const grossProfit = engine.getValue(
      AccountCode.of("gross_profit"),
      forecastPeriod,
    );
    const sga = engine.getValue(AccountCode.of("sga"), forecastPeriod);
    const operatingProfit = engine.getValue(
      AccountCode.of("operating_profit"),
      forecastPeriod,
    );

    // revenue = 1000 * 1.05 = 1050
    expect(revenue?.amount).toBeCloseTo(1050);
    // cogs = 1050 * 0.70 = 735
    expect(cogs?.amount).toBeCloseTo(735);
    // gross_profit = 1050 - 735 = 315
    expect(grossProfit?.amount).toBeCloseTo(315);
    // sga = 200 (manual input)
    expect(sga?.amount).toBe(200);
    // operating_profit = 315 - 200 = 115
    expect(operatingProfit?.amount).toBeCloseTo(115);
  });

  it("preserves actual values after compute", () => {
    const hierarchy = buildTestHierarchy();
    const setting = buildTestSetting();
    const periods = Periods.generate(setting);
    const actualPeriods = periods.getActuals();

    const actuals = buildActuals(
      ["revenue", "cogs", "gross_profit", "sga", "operating_profit"],
      actualPeriods,
      {
        revenue: 1000,
        cogs: 700,
        gross_profit: 300,
        sga: 200,
        operating_profit: 100,
      },
    );

    const rules: Rule[] = [
      new GrowthRateRule(AccountCode.of("revenue"), GrowthRate.of(0.05)),
      new ManualInputRule(AccountCode.of("cogs"), Money.of(700)),
      new ManualInputRule(AccountCode.of("gross_profit"), Money.of(300)),
      new ManualInputRule(AccountCode.of("sga"), Money.of(200)),
      new ManualInputRule(AccountCode.of("operating_profit"), Money.of(100)),
    ];

    const engine = AstEngine.create();
    engine.registerRules({ actuals, rules, periods, hierarchy });
    engine.compute();

    // Check that actual period values remain unchanged
    const actualPeriod = Period.of(2024, 4);
    expect(
      engine.getValue(AccountCode.of("revenue"), actualPeriod)?.amount,
    ).toBe(1000);
    expect(
      engine.getValue(AccountCode.of("cogs"), actualPeriod)?.amount,
    ).toBe(700);
  });

  it("applies rules only to forecast periods", () => {
    const hierarchy = buildTestHierarchy();
    const setting = buildTestSetting();
    const periods = Periods.generate(setting);
    const actualPeriods = periods.getActuals();

    const actuals = buildActuals(
      ["revenue"],
      actualPeriods,
      { revenue: 1000 },
    );

    const rules: Rule[] = [
      new GrowthRateRule(AccountCode.of("revenue"), GrowthRate.of(0.1)),
    ];

    const engine = AstEngine.create();
    engine.registerRules({ actuals, rules, periods, hierarchy });
    engine.compute();

    // All actual months should have 1000
    for (const period of actualPeriods) {
      const val = engine.getValue(AccountCode.of("revenue"), period);
      expect(val?.amount).toBe(1000);
    }

    // First forecast month (2025/1, prev=2024/12 actual): 1000 * 1.1 = 1100
    expect(
      engine.getValue(AccountCode.of("revenue"), Period.of(2025, 1))?.amount,
    ).toBeCloseTo(1100);

    // Second forecast month (2025/2): 1100 * 1.1 = 1210
    expect(
      engine.getValue(AccountCode.of("revenue"), Period.of(2025, 2))?.amount,
    ).toBeCloseTo(1210);
  });

  it("reports errors for circular dependencies", () => {
    const hierarchy = buildTestHierarchy();
    const setting = FiscalYearSetting.of({
      fiscalYearEndMonth: 3,
      actualPeriodCount: 1,
      forecastPeriodCount: 1,
      startFiscalYear: 2024,
    });
    const periods = Periods.generate(setting);
    const actualPeriods = periods.getActuals();

    const actuals = buildActuals(
      ["revenue", "cogs"],
      actualPeriods,
      { revenue: 1000, cogs: 700 },
    );

    // Create circular rules: revenue depends on cogs, cogs depends on revenue
    const rules: Rule[] = [
      new PercentageRule(
        AccountCode.of("revenue"),
        AccountCode.of("cogs"),
        Ratio.of(1.5),
      ),
      new PercentageRule(
        AccountCode.of("cogs"),
        AccountCode.of("revenue"),
        Ratio.of(0.7),
      ),
    ];

    const engine = AstEngine.create();
    engine.registerRules({ actuals, rules, periods, hierarchy });
    const result = engine.compute();

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("Circular dependency");
  });
});
