import { describe, it, expect } from "vitest";
import { Periods } from "./Periods";
import { FiscalYearSetting } from "./FiscalYearSetting";
import { Period } from "./Period";

describe("Periods", () => {
  // 3月決算、2023年度開始、実績2期、予測3期 → 合計5年 × 12ヶ月 = 60期間
  const setting = FiscalYearSetting.of({
    fiscalYearEndMonth: 3,
    actualPeriodCount: 2,
    forecastPeriodCount: 3,
    startFiscalYear: 2023,
  });
  const periods = Periods.generate(setting);

  it("generates correct total count", () => {
    expect(periods.count()).toBe(60); // 5 years × 12 months
  });

  it("first period starts at correct month", () => {
    const first = periods.first();
    expect(first.fiscalYear).toBe(2023);
    expect(first.month).toBe(4); // 3月決算 → 4月開始
  });

  it("last period ends at correct month", () => {
    const last = periods.last();
    expect(last.fiscalYear).toBe(2027);
    expect(last.month).toBe(3); // 3月決算
  });

  it("getActuals returns only actual periods", () => {
    const actuals = periods.getActuals();
    expect(actuals.length).toBe(24); // 2 years × 12 months
    expect(actuals[0].fiscalYear).toBe(2023);
    expect(actuals[actuals.length - 1].fiscalYear).toBe(2024);
  });

  it("getForecasts returns only forecast periods", () => {
    const forecasts = periods.getForecasts();
    expect(forecasts.length).toBe(36); // 3 years × 12 months
    expect(forecasts[0].fiscalYear).toBe(2025);
  });

  it("contains returns true for existing period", () => {
    expect(periods.contains(Period.of(2023, 4))).toBe(true);
    expect(periods.contains(Period.of(2027, 3))).toBe(true);
  });

  it("contains returns false for non-existing period", () => {
    expect(periods.contains(Period.of(2022, 12))).toBe(false);
    expect(periods.contains(Period.of(2028, 1))).toBe(false);
  });

  it("getLabels returns formatted labels", () => {
    const labels = periods.getLabels();
    expect(labels[0]).toBe("FY2023/4");
    expect(labels[labels.length - 1]).toBe("FY2027/3");
  });

  it("isActual and isForecast work correctly", () => {
    expect(periods.isActual(Period.of(2023, 6))).toBe(true);
    expect(periods.isForecast(Period.of(2023, 6))).toBe(false);
    expect(periods.isActual(Period.of(2025, 6))).toBe(false);
    expect(periods.isForecast(Period.of(2025, 6))).toBe(true);
  });

  it("months follow fiscal year order (April to March for 3月決算)", () => {
    const all = periods.getAll();
    // First year: months should go 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3
    const firstYearMonths = all.slice(0, 12).map((p) => p.month);
    expect(firstYearMonths).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]);
  });
});
