import { Period } from "./Period";

export class FiscalYearSetting {
  readonly fiscalYearEndMonth: number;
  readonly actualPeriodCount: number;
  readonly forecastPeriodCount: number;
  readonly startFiscalYear: number;

  private constructor(params: {
    fiscalYearEndMonth: number;
    actualPeriodCount: number;
    forecastPeriodCount: number;
    startFiscalYear: number;
  }) {
    this.fiscalYearEndMonth = params.fiscalYearEndMonth;
    this.actualPeriodCount = params.actualPeriodCount;
    this.forecastPeriodCount = params.forecastPeriodCount;
    this.startFiscalYear = params.startFiscalYear;
    Object.freeze(this);
  }

  static of(params: {
    fiscalYearEndMonth: number;
    actualPeriodCount: number;
    forecastPeriodCount: number;
    startFiscalYear: number;
  }): FiscalYearSetting {
    if (params.fiscalYearEndMonth < 1 || params.fiscalYearEndMonth > 12) {
      throw new Error("fiscalYearEndMonth must be between 1 and 12");
    }
    if (params.actualPeriodCount < 0) {
      throw new Error("actualPeriodCount must be non-negative");
    }
    if (params.forecastPeriodCount < 0) {
      throw new Error("forecastPeriodCount must be non-negative");
    }
    return new FiscalYearSetting(params);
  }

  getStartMonth(): number {
    return this.fiscalYearEndMonth === 12 ? 1 : this.fiscalYearEndMonth + 1;
  }

  isActualPeriod(period: Period): boolean {
    const actualStartYear = this.startFiscalYear;
    const actualEndYear = this.startFiscalYear + this.actualPeriodCount - 1;
    return period.fiscalYear >= actualStartYear && period.fiscalYear <= actualEndYear;
  }

  isForecastPeriod(period: Period): boolean {
    const forecastStartYear = this.startFiscalYear + this.actualPeriodCount;
    const forecastEndYear = forecastStartYear + this.forecastPeriodCount - 1;
    return period.fiscalYear >= forecastStartYear && period.fiscalYear <= forecastEndYear;
  }
}
