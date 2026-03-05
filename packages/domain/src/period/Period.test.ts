import { describe, it, expect } from "vitest";
import { Period } from "./Period";

describe("Period", () => {
  it("creates from fiscalYear and month", () => {
    const period = Period.of(2024, 4);
    expect(period.fiscalYear).toBe(2024);
    expect(period.month).toBe(4);
  });

  it("throws on invalid month (0)", () => {
    expect(() => Period.of(2024, 0)).toThrow("Month must be between 1 and 12");
  });

  it("throws on invalid month (13)", () => {
    expect(() => Period.of(2024, 13)).toThrow("Month must be between 1 and 12");
  });

  it("equals returns true for same values", () => {
    const a = Period.of(2024, 4);
    const b = Period.of(2024, 4);
    expect(a.equals(b)).toBe(true);
  });

  it("equals returns false for different values", () => {
    expect(Period.of(2024, 4).equals(Period.of(2024, 5))).toBe(false);
    expect(Period.of(2024, 4).equals(Period.of(2025, 4))).toBe(false);
  });

  it("next advances month", () => {
    const next = Period.of(2024, 4).next();
    expect(next.fiscalYear).toBe(2024);
    expect(next.month).toBe(5);
  });

  it("next wraps from December to January (next year)", () => {
    const next = Period.of(2024, 12).next();
    expect(next.fiscalYear).toBe(2025);
    expect(next.month).toBe(1);
  });

  it("prev goes back one month", () => {
    const prev = Period.of(2024, 4).prev();
    expect(prev.fiscalYear).toBe(2024);
    expect(prev.month).toBe(3);
  });

  it("prev wraps from January to December (previous year)", () => {
    const prev = Period.of(2024, 1).prev();
    expect(prev.fiscalYear).toBe(2023);
    expect(prev.month).toBe(12);
  });

  it("toLabel formats correctly", () => {
    expect(Period.of(2024, 4).toLabel()).toBe("FY2024/4");
    expect(Period.of(2025, 12).toLabel()).toBe("FY2025/12");
  });

  it("compareTo sorts by year first, then month", () => {
    expect(Period.of(2024, 4).compareTo(Period.of(2024, 5))).toBeLessThan(0);
    expect(Period.of(2024, 5).compareTo(Period.of(2024, 4))).toBeGreaterThan(0);
    expect(Period.of(2024, 4).compareTo(Period.of(2024, 4))).toBe(0);
    expect(Period.of(2024, 12).compareTo(Period.of(2025, 1))).toBeLessThan(0);
  });

  it("toKey returns zero-padded key", () => {
    expect(Period.of(2024, 4).toKey()).toBe("2024-04");
    expect(Period.of(2024, 12).toKey()).toBe("2024-12");
  });

  it("is immutable", () => {
    const period = Period.of(2024, 4);
    expect(() => {
      (period as unknown as Record<string, unknown>).month = 5;
    }).toThrow();
  });
});
