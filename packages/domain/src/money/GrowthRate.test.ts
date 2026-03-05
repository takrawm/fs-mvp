import { describe, it, expect } from "vitest";
import { GrowthRate } from "./GrowthRate";
import { Money } from "./Money";

describe("GrowthRate", () => {
  it("creates from a rate", () => {
    const rate = GrowthRate.of(0.05);
    expect(rate.rate).toBe(0.05);
  });

  it("applies growth rate to Money", () => {
    const rate = GrowthRate.of(0.05);
    const result = rate.apply(Money.of(1000));
    expect(result.amount).toBeCloseTo(1050);
  });

  it("applies negative growth rate", () => {
    const rate = GrowthRate.of(-0.1);
    const result = rate.apply(Money.of(1000));
    expect(result.amount).toBeCloseTo(900);
  });

  it("applies zero growth rate", () => {
    const rate = GrowthRate.of(0);
    const result = rate.apply(Money.of(1000));
    expect(result.amount).toBe(1000);
  });

  it("toPercentString formats correctly", () => {
    expect(GrowthRate.of(0.05).toPercentString()).toBe("5.0%");
    expect(GrowthRate.of(0.123).toPercentString()).toBe("12.3%");
  });

  it("is immutable", () => {
    const rate = GrowthRate.of(0.05);
    expect(() => {
      (rate as unknown as Record<string, unknown>).rate = 0.99;
    }).toThrow();
  });
});
