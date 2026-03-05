import { Money } from "./Money";

export class Ratio {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
    Object.freeze(this);
  }

  static of(value: number): Ratio {
    return new Ratio(value);
  }

  apply(base: Money): Money {
    return base.multiply(this.value);
  }

  toPercentString(): string {
    return `${(this.value * 100).toFixed(1)}%`;
  }
}
