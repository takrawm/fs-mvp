import { describe, it, expect } from "vitest";
import { Account } from "./Account";
import { AccountCode } from "./AccountCode";

describe("Account", () => {
  it("creates an account with valid params", () => {
    const account = Account.create({
      code: "revenue",
      name: "売上高",
      type: "PL",
      side: "CREDIT",
      parentCode: null,
      sortOrder: 1,
    });
    expect(account.code.value).toBe("revenue");
    expect(account.name.value).toBe("売上高");
    expect(account.type).toBe("PL");
    expect(account.side).toBe("CREDIT");
    expect(account.parentCode).toBeNull();
    expect(account.sortOrder).toBe(1);
  });

  it("creates an account with parentCode", () => {
    const account = Account.create({
      code: "cogs",
      name: "売上原価",
      type: "PL",
      side: "DEBIT",
      parentCode: "revenue",
      sortOrder: 2,
    });
    expect(account.parentCode?.value).toBe("revenue");
  });

  it("isRoot returns true when parentCode is null", () => {
    const account = Account.create({
      code: "revenue",
      name: "売上高",
      type: "PL",
      side: "CREDIT",
      parentCode: null,
      sortOrder: 1,
    });
    expect(account.isRoot()).toBe(true);
  });

  it("isRoot returns false when parentCode exists", () => {
    const account = Account.create({
      code: "cogs",
      name: "売上原価",
      type: "PL",
      side: "DEBIT",
      parentCode: "revenue",
      sortOrder: 2,
    });
    expect(account.isRoot()).toBe(false);
  });

  it("belongsTo returns true for matching type", () => {
    const account = Account.create({
      code: "cash",
      name: "現預金",
      type: "BS",
      side: "DEBIT",
      parentCode: null,
      sortOrder: 1,
    });
    expect(account.belongsTo("BS")).toBe(true);
    expect(account.belongsTo("PL")).toBe(false);
  });

  it("is immutable", () => {
    const account = Account.create({
      code: "revenue",
      name: "売上高",
      type: "PL",
      side: "CREDIT",
      parentCode: null,
      sortOrder: 1,
    });
    expect(() => {
      (account as unknown as Record<string, unknown>).sortOrder = 999;
    }).toThrow();
  });

  describe("side and aggregationSign", () => {
    it("DEBIT side has aggregationSign 1", () => {
      const account = Account.create({
        code: "cash",
        name: "現預金",
        type: "BS",
        side: "DEBIT",
        parentCode: null,
        sortOrder: 1,
      });
      expect(account.side).toBe("DEBIT");
      expect(account.aggregationSign).toBe(1);
    });

    it("CREDIT side has aggregationSign -1", () => {
      const account = Account.create({
        code: "revenue",
        name: "売上高",
        type: "PL",
        side: "CREDIT",
        parentCode: null,
        sortOrder: 1,
      });
      expect(account.side).toBe("CREDIT");
      expect(account.aggregationSign).toBe(-1);
    });
  });

  describe("isStructural", () => {
    it("defaults to false when not specified", () => {
      const account = Account.create({
        code: "salary",
        name: "給与手当",
        type: "PL",
        side: "DEBIT",
        parentCode: null,
        sortOrder: 1,
      });
      expect(account.isStructural).toBe(false);
    });

    it("can be set to true", () => {
      const account = Account.create({
        code: "revenue",
        name: "売上高",
        type: "PL",
        side: "CREDIT",
        parentCode: null,
        sortOrder: 1,
        isStructural: true,
      });
      expect(account.isStructural).toBe(true);
    });
  });

  describe("changeParent", () => {
    it("returns a new Account with updated parentCode", () => {
      const account = Account.create({
        code: "salary",
        name: "給与手当",
        type: "PL",
        side: "DEBIT",
        parentCode: "sga",
        sortOrder: 5,
      });
      const newParent = AccountCode.of("personnel_cost");
      const changed = account.changeParent(newParent);

      expect(changed.parentCode?.value).toBe("personnel_cost");
      expect(changed.code.value).toBe("salary");
      expect(changed.name.value).toBe("給与手当");
      expect(changed.type).toBe("PL");
      expect(changed.side).toBe("DEBIT");
      expect(changed.sortOrder).toBe(5);
      expect(changed.isStructural).toBe(false);
      // original is unchanged
      expect(account.parentCode?.value).toBe("sga");
    });

    it("can change parentCode to null", () => {
      const account = Account.create({
        code: "salary",
        name: "給与手当",
        type: "PL",
        side: "DEBIT",
        parentCode: "sga",
        sortOrder: 5,
      });
      const changed = account.changeParent(null);
      expect(changed.parentCode).toBeNull();
    });

    it("throws when called on a structural account", () => {
      const account = Account.create({
        code: "revenue",
        name: "売上高",
        type: "PL",
        side: "CREDIT",
        parentCode: null,
        sortOrder: 1,
        isStructural: true,
      });
      expect(() => account.changeParent(AccountCode.of("new_parent"))).toThrow(
        'Cannot change parentCode of structural account "revenue"',
      );
    });
  });
});
