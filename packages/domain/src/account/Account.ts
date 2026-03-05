import { AccountCode } from "./AccountCode";
import { AccountName } from "./AccountName";
import type { AccountType } from "./AccountType";

export class Account {
  readonly code: AccountCode;
  readonly name: AccountName;
  readonly type: AccountType;
  readonly parentCode: AccountCode | null;
  readonly sortOrder: number;

  private constructor(params: {
    code: AccountCode;
    name: AccountName;
    type: AccountType;
    parentCode: AccountCode | null;
    sortOrder: number;
  }) {
    this.code = params.code;
    this.name = params.name;
    this.type = params.type;
    this.parentCode = params.parentCode;
    this.sortOrder = params.sortOrder;
    Object.freeze(this);
  }

  static create(params: {
    code: string;
    name: string;
    type: AccountType;
    parentCode: string | null;
    sortOrder: number;
  }): Account {
    return new Account({
      code: AccountCode.of(params.code),
      name: AccountName.of(params.name),
      type: params.type,
      parentCode: params.parentCode ? AccountCode.of(params.parentCode) : null,
      sortOrder: params.sortOrder,
    });
  }

  isRoot(): boolean {
    return this.parentCode === null;
  }

  belongsTo(type: AccountType): boolean {
    return this.type === type;
  }
}
