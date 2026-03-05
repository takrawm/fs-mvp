export class AccountCode {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static of(value: string): AccountCode {
    if (!value || value.trim() === "") {
      throw new Error("AccountCode must not be empty");
    }
    return new AccountCode(value.trim());
  }

  equals(other: AccountCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
