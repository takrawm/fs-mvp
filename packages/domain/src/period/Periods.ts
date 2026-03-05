import { Period } from "./Period";
import { FiscalYearSetting } from "./FiscalYearSetting";

export class Periods {
  private readonly periods: readonly Period[];
  private readonly setting: FiscalYearSetting;

  private constructor(periods: readonly Period[], setting: FiscalYearSetting) {
    this.periods = periods;
    this.setting = setting;
    Object.freeze(this);
  }

  static generate(setting: FiscalYearSetting): Periods {
    const periods: Period[] = [];
    const totalYears = setting.actualPeriodCount + setting.forecastPeriodCount;
    const startMonth = setting.getStartMonth();

    for (let yearOffset = 0; yearOffset < totalYears; yearOffset++) {
      const fiscalYear = setting.startFiscalYear + yearOffset;
      for (let m = 0; m < 12; m++) {
        const month = ((startMonth - 1 + m) % 12) + 1;
        periods.push(Period.of(fiscalYear, month));
      }
    }

    return new Periods(periods, setting);
  }

  getAll(): readonly Period[] {
    return this.periods;
  }

  getActuals(): readonly Period[] {
    return this.periods.filter((p) => this.setting.isActualPeriod(p));
  }

  getForecasts(): readonly Period[] {
    return this.periods.filter((p) => this.setting.isForecastPeriod(p));
  }

  getLabels(): string[] {
    return this.periods.map((p) => p.toLabel());
  }

  contains(period: Period): boolean {
    return this.periods.some((p) => p.equals(period));
  }

  first(): Period {
    if (this.periods.length === 0) {
      throw new Error("No periods available");
    }
    return this.periods[0];
  }

  last(): Period {
    if (this.periods.length === 0) {
      throw new Error("No periods available");
    }
    return this.periods[this.periods.length - 1];
  }

  count(): number {
    return this.periods.length;
  }

  isActual(period: Period): boolean {
    return this.setting.isActualPeriod(period);
  }

  isForecast(period: Period): boolean {
    return this.setting.isForecastPeriod(period);
  }

  getSetting(): FiscalYearSetting {
    return this.setting;
  }
}
