import { describe, it, expect } from "vitest";
import { Money } from "./Money";

describe("Money", () => {
  it("creates from a number", () => {
    const money = Money.of(1000);
    expect(money.amount).toBe(1000);
  });

  it("creates zero", () => {
    const money = Money.zero();
    expect(money.amount).toBe(0);
    expect(money.isZero()).toBe(true);
  });

  it("adds two Money values", () => {
    const result = Money.of(100).add(Money.of(200));
    expect(result.amount).toBe(300);
  });

  it("subtracts two Money values", () => {
    const result = Money.of(300).subtract(Money.of(100));
    expect(result.amount).toBe(200);
  });

  it("multiplies by a factor", () => {
    const result = Money.of(1000).multiply(0.7);
    expect(result.amount).toBeCloseTo(700);
  });

  it("negates", () => {
    const result = Money.of(100).negate();
    expect(result.amount).toBe(-100);
  });

  it("equals returns true for same amount", () => {
    expect(Money.of(100).equals(Money.of(100))).toBe(true);
  });

  it("equals returns false for different amounts", () => {
    expect(Money.of(100).equals(Money.of(200))).toBe(false);
  });

  it("returns new instance on operations (immutability)", () => {
    const a = Money.of(100);
    const b = a.add(Money.of(50));
    expect(a.amount).toBe(100);
    expect(b.amount).toBe(150);
  });

  it("is immutable (frozen)", () => {
    const money = Money.of(100);
    expect(() => {
      (money as unknown as Record<string, unknown>).amount = 999;
    }).toThrow();
  });

  it("toDisplay formats without unit", () => {
    const money = Money.of(1234567);
    expect(money.toDisplay()).toBe("1,234,567");
  });

  it("toDisplay formats in thousands", () => {
    const money = Money.of(1_500_000);
    expect(money.toDisplay("thousands")).toBe("1,500千円");
  });

  it("toDisplay formats in millions", () => {
    const money = Money.of(12_500_000);
    expect(money.toDisplay("millions")).toBe("13百万円");
  });
});
