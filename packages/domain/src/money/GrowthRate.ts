import { Money } from "./Money";

export class GrowthRate {
  readonly rate: number;

  private constructor(rate: number) {
    this.rate = rate;
    Object.freeze(this);
  }

  static of(rate: number): GrowthRate {
    return new GrowthRate(rate);
  }

  apply(base: Money): Money {
    return base.multiply(1 + this.rate);
  }

  toPercentString(): string {
    return `${(this.rate * 100).toFixed(1)}%`;
  }
}
