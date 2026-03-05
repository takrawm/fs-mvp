export class Money {
  readonly amount: number;

  private constructor(amount: number) {
    this.amount = amount;
    Object.freeze(this);
  }

  static of(amount: number): Money {
    return new Money(amount);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    return new Money(this.amount - other.amount);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor);
  }

  negate(): Money {
    return new Money(-this.amount);
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }

  toDisplay(unit?: "thousands" | "millions"): string {
    let value = this.amount;
    let suffix = "";
    if (unit === "thousands") {
      value = Math.round(value / 1000);
      suffix = "千円";
    } else if (unit === "millions") {
      value = Math.round(value / 1_000_000);
      suffix = "百万円";
    }
    return value.toLocaleString("ja-JP") + suffix;
  }
}
