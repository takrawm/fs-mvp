export class Period {
  readonly fiscalYear: number;
  readonly month: number;

  private constructor(fiscalYear: number, month: number) {
    this.fiscalYear = fiscalYear;
    this.month = month;
    Object.freeze(this);
  }

  static of(fiscalYear: number, month: number): Period {
    if (month < 1 || month > 12) {
      throw new Error(`Month must be between 1 and 12, got ${month}`);
    }
    return new Period(fiscalYear, month);
  }

  equals(other: Period): boolean {
    return this.fiscalYear === other.fiscalYear && this.month === other.month;
  }

  next(): Period {
    if (this.month === 12) {
      return new Period(this.fiscalYear + 1, 1);
    }
    return new Period(this.fiscalYear, this.month + 1);
  }

  prev(): Period {
    if (this.month === 1) {
      return new Period(this.fiscalYear - 1, 12);
    }
    return new Period(this.fiscalYear, this.month - 1);
  }

  toLabel(): string {
    return `FY${this.fiscalYear}/${this.month}`;
  }

  compareTo(other: Period): number {
    if (this.fiscalYear !== other.fiscalYear) {
      return this.fiscalYear - other.fiscalYear;
    }
    return this.month - other.month;
  }

  toKey(): string {
    return `${this.fiscalYear}-${String(this.month).padStart(2, "0")}`;
  }
}
