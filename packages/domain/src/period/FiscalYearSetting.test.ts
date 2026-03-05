import { describe, it, expect } from "vitest";
import { FiscalYearSetting } from "./FiscalYearSetting";
import { Period } from "./Period";

describe("FiscalYearSetting", () => {
  // 3月決算、2023年度開始、実績2期、予測3期
  const setting = FiscalYearSetting.of({
    fiscalYearEndMonth: 3,
    actualPeriodCount: 2,
    forecastPeriodCount: 3,
    startFiscalYear: 2023,
  });

  it("creates with valid params", () => {
    expect(setting.fiscalYearEndMonth).toBe(3);
    expect(setting.actualPeriodCount).toBe(2);
    expect(setting.forecastPeriodCount).toBe(3);
    expect(setting.startFiscalYear).toBe(2023);
  });

  it("throws on invalid fiscalYearEndMonth", () => {
    expect(() =>
      FiscalYearSetting.of({
        fiscalYearEndMonth: 0,
        actualPeriodCount: 1,
        forecastPeriodCount: 1,
        startFiscalYear: 2023,
      }),
    ).toThrow("fiscalYearEndMonth must be between 1 and 12");
  });

  it("getStartMonth returns correct start (3月決算 → 4月開始)", () => {
    expect(setting.getStartMonth()).toBe(4);
  });

  it("getStartMonth for 12月決算 → 1月開始", () => {
    const decSetting = FiscalYearSetting.of({
      fiscalYearEndMonth: 12,
      actualPeriodCount: 1,
      forecastPeriodCount: 1,
      startFiscalYear: 2023,
    });
    expect(decSetting.getStartMonth()).toBe(1);
  });

  it("isActualPeriod returns true for actual years", () => {
    // 実績: 2023, 2024
    expect(setting.isActualPeriod(Period.of(2023, 4))).toBe(true);
    expect(setting.isActualPeriod(Period.of(2024, 3))).toBe(true);
  });

  it("isActualPeriod returns false for forecast years", () => {
    expect(setting.isActualPeriod(Period.of(2025, 4))).toBe(false);
  });

  it("isForecastPeriod returns true for forecast years", () => {
    // 予測: 2025, 2026, 2027
    expect(setting.isForecastPeriod(Period.of(2025, 4))).toBe(true);
    expect(setting.isForecastPeriod(Period.of(2027, 3))).toBe(true);
  });

  it("isForecastPeriod returns false for actual years", () => {
    expect(setting.isForecastPeriod(Period.of(2023, 4))).toBe(false);
  });

  it("is immutable", () => {
    expect(() => {
      (setting as unknown as Record<string, unknown>).fiscalYearEndMonth = 12;
    }).toThrow();
  });
});
