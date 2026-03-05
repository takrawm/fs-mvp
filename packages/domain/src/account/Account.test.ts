import { describe, it, expect } from "vitest";
import { Account } from "./Account";

describe("Account", () => {
  it("creates an account with valid params", () => {
    const account = Account.create({
      code: "revenue",
      name: "売上高",
      type: "PL",
      parentCode: null,
      sortOrder: 1,
    });
    expect(account.code.value).toBe("revenue");
    expect(account.name.value).toBe("売上高");
    expect(account.type).toBe("PL");
    expect(account.parentCode).toBeNull();
    expect(account.sortOrder).toBe(1);
  });

  it("creates an account with parentCode", () => {
    const account = Account.create({
      code: "cogs",
      name: "売上原価",
      type: "PL",
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
      parentCode: null,
      sortOrder: 1,
    });
    expect(() => {
      (account as unknown as Record<string, unknown>).sortOrder = 999;
    }).toThrow();
  });
});
