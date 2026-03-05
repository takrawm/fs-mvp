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
