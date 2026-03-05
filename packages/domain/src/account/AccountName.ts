export class AccountName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static of(value: string): AccountName {
    if (!value || value.trim() === "") {
      throw new Error("AccountName must not be empty");
    }
    return new AccountName(value.trim());
  }

  toString(): string {
    return this.value;
  }
}
