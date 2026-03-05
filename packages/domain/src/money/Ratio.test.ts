import { describe, it, expect } from "vitest";
import { Ratio } from "./Ratio";
import { Money } from "./Money";

describe("Ratio", () => {
  it("creates from a value", () => {
    const ratio = Ratio.of(0.7);
    expect(ratio.value).toBe(0.7);
  });

  it("applies ratio to Money", () => {
    const ratio = Ratio.of(0.7);
    const result = ratio.apply(Money.of(1000));
    expect(result.amount).toBeCloseTo(700);
  });

  it("applies 100% ratio", () => {
    const ratio = Ratio.of(1.0);
    const result = ratio.apply(Money.of(500));
    expect(result.amount).toBe(500);
  });

  it("applies zero ratio", () => {
    const ratio = Ratio.of(0);
    const result = ratio.apply(Money.of(1000));
    expect(result.amount).toBe(0);
  });

  it("toPercentString formats correctly", () => {
    expect(Ratio.of(0.7).toPercentString()).toBe("70.0%");
    expect(Ratio.of(0.333).toPercentString()).toBe("33.3%");
  });

  it("is immutable", () => {
    const ratio = Ratio.of(0.7);
    expect(() => {
      (ratio as unknown as Record<string, unknown>).value = 0.99;
    }).toThrow();
  });
});
