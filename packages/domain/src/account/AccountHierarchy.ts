import { AccountCode } from "./AccountCode";
import type { AccountType } from "./AccountType";
import { Account } from "./Account";

export class AccountHierarchy {
  private readonly accounts: ReadonlyMap<string, Account>;
  private readonly childMap: ReadonlyMap<string, AccountCode[]>;

  private constructor(
    accounts: ReadonlyMap<string, Account>,
    childMap: ReadonlyMap<string, AccountCode[]>,
  ) {
    this.accounts = accounts;
    this.childMap = childMap;
    Object.freeze(this);
  }

  static build(accounts: Account[]): AccountHierarchy {
    const accountMap = new Map<string, Account>();
    const childMap = new Map<string, AccountCode[]>();

    for (const account of accounts) {
      accountMap.set(account.code.value, account);
    }

    for (const account of accounts) {
      if (account.parentCode) {
        const parentKey = account.parentCode.value;
        if (!accountMap.has(parentKey)) {
          throw new Error(`Parent account "${parentKey}" not found for account "${account.code.value}"`);
        }
        const children = childMap.get(parentKey) ?? [];
        children.push(account.code);
        childMap.set(parentKey, children);
      }
    }

    const hierarchy = new AccountHierarchy(accountMap, childMap);
    hierarchy.detectCycle(accounts);
    return hierarchy;
  }

  getByCode(code: AccountCode): Account {
    const account = this.accounts.get(code.value);
    if (!account) {
      throw new Error(`Account "${code.value}" not found`);
    }
    return account;
  }

  getChildren(code: AccountCode): Account[] {
    const childCodes = this.childMap.get(code.value) ?? [];
    return childCodes.map((c) => this.getByCode(c));
  }

  getLeaves(): Account[] {
    return [...this.accounts.values()].filter((a) => this.isLeaf(a.code));
  }

  getByType(type: AccountType): Account[] {
    return [...this.accounts.values()].filter((a) => a.belongsTo(type));
  }

  getRoots(): Account[] {
    return [...this.accounts.values()].filter((a) => a.isRoot());
  }

  isLeaf(code: AccountCode): boolean {
    const children = this.childMap.get(code.value);
    return !children || children.length === 0;
  }

  getDepth(code: AccountCode): number {
    const account = this.getByCode(code);
    if (account.isRoot() || account.parentCode === null) return 0;
    return 1 + this.getDepth(account.parentCode);
  }

  toSorted(): Account[] {
    return [...this.accounts.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getAllAccounts(): Account[] {
    return [...this.accounts.values()];
  }

  insertParentAbove(
    newParent: Account,
    childCodes: AccountCode[],
  ): AccountHierarchy {
    if (this.accounts.has(newParent.code.value)) {
      throw new Error(`Account "${newParent.code.value}" already exists`);
    }

    const children = childCodes.map((code) => this.getByCode(code));

    const firstParentCode = children[0].parentCode?.value ?? null;
    for (const child of children) {
      const parentValue = child.parentCode?.value ?? null;
      if (parentValue !== firstParentCode) {
        throw new Error("All children must have the same parentCode");
      }
    }

    for (const child of children) {
      if (child.isStructural) {
        throw new Error(
          `Cannot change parentCode of structural account "${child.code.value}"`,
        );
      }
    }

    const childCodeSet = new Set(childCodes.map((c) => c.value));
    const newAccounts: Account[] = [];

    for (const account of this.accounts.values()) {
      if (childCodeSet.has(account.code.value)) {
        newAccounts.push(account.changeParent(newParent.code));
      } else {
        newAccounts.push(account);
      }
    }

    newAccounts.push(newParent);

    return AccountHierarchy.build(newAccounts);
  }

  addChildrenTo(
    targetCode: AccountCode,
    newChildren: Account[],
  ): AccountHierarchy {
    this.getByCode(targetCode);

    if (!this.isLeaf(targetCode)) {
      throw new Error(`Account "${targetCode.value}" is not a leaf account`);
    }

    for (const child of newChildren) {
      if (this.accounts.has(child.code.value)) {
        throw new Error(`Account "${child.code.value}" already exists`);
      }
      if (child.parentCode?.value !== targetCode.value) {
        throw new Error(
          `Child account "${child.code.value}" must have parentCode "${targetCode.value}"`,
        );
      }
    }

    const newAccounts = [...this.accounts.values(), ...newChildren];
    return AccountHierarchy.build(newAccounts);
  }

  private detectCycle(accounts: Account[]): void {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (code: string): void => {
      if (inStack.has(code)) {
        throw new Error(`Circular reference detected involving account "${code}"`);
      }
      if (visited.has(code)) return;

      inStack.add(code);
      visited.add(code);

      const children = this.childMap.get(code) ?? [];
      for (const child of children) {
        dfs(child.value);
      }

      inStack.delete(code);
    };

    for (const account of accounts) {
      if (account.isRoot()) {
        dfs(account.code.value);
      }
    }
  }
}
