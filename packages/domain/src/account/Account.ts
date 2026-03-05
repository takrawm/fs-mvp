import { AccountCode } from "./AccountCode";
import { AccountName } from "./AccountName";
import type { AccountType } from "./AccountType";
import type { AccountSide } from "./AccountSide";

export class Account {
  readonly code: AccountCode;
  readonly name: AccountName;
  readonly type: AccountType;
  readonly side: AccountSide;
  readonly parentCode: AccountCode | null;
  readonly sortOrder: number;
  readonly isStructural: boolean;

  private constructor(params: {
    code: AccountCode;
    name: AccountName;
    type: AccountType;
    side: AccountSide;
    parentCode: AccountCode | null;
    sortOrder: number;
    isStructural: boolean;
  }) {
    this.code = params.code;
    this.name = params.name;
    this.type = params.type;
    this.side = params.side;
    this.parentCode = params.parentCode;
    this.sortOrder = params.sortOrder;
    this.isStructural = params.isStructural;
    Object.freeze(this);
  }

  static create(params: {
    code: string;
    name: string;
    type: AccountType;
    side: AccountSide;
    parentCode: string | null;
    sortOrder: number;
    isStructural?: boolean;
  }): Account {
    return new Account({
      code: AccountCode.of(params.code),
      name: AccountName.of(params.name),
      type: params.type,
      side: params.side,
      parentCode: params.parentCode ? AccountCode.of(params.parentCode) : null,
      sortOrder: params.sortOrder,
      isStructural: params.isStructural ?? false,
    });
  }

  get aggregationSign(): 1 | -1 {
    return this.side === "DEBIT" ? 1 : -1;
  }

  isRoot(): boolean {
    return this.parentCode === null;
  }

  belongsTo(type: AccountType): boolean {
    return this.type === type;
  }

  changeParent(newParentCode: AccountCode | null): Account {
    if (this.isStructural) {
      throw new Error(
        `Cannot change parentCode of structural account "${this.code.value}"`,
      );
    }
    return new Account({
      code: this.code,
      name: this.name,
      type: this.type,
      side: this.side,
      parentCode: newParentCode,
      sortOrder: this.sortOrder,
      isStructural: this.isStructural,
    });
  }
}
