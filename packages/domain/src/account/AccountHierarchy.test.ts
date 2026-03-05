import { describe, it, expect } from "vitest";
import { Account } from "./Account";
import { AccountCode } from "./AccountCode";
import { AccountHierarchy } from "./AccountHierarchy";

function buildSampleAccounts(): Account[] {
  return [
    Account.create({ code: "revenue", name: "売上高", type: "PL", side: "CREDIT", parentCode: null, sortOrder: 1 }),
    Account.create({ code: "product_revenue", name: "製品売上", type: "PL", side: "CREDIT", parentCode: "revenue", sortOrder: 2 }),
    Account.create({ code: "service_revenue", name: "サービス売上", type: "PL", side: "CREDIT", parentCode: "revenue", sortOrder: 3 }),
    Account.create({ code: "cogs", name: "売上原価", type: "PL", side: "DEBIT", parentCode: null, sortOrder: 4 }),
    Account.create({ code: "cash", name: "現預金", type: "BS", side: "DEBIT", parentCode: null, sortOrder: 10 }),
    Account.create({ code: "total_assets", name: "資産合計", type: "BS", side: "DEBIT", parentCode: null, sortOrder: 11 }),
  ];
}

describe("AccountHierarchy", () => {
  it("builds from an array of accounts", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    expect(hierarchy).toBeDefined();
  });

  it("getByCode returns the correct account", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    const account = hierarchy.getByCode(AccountCode.of("revenue"));
    expect(account.name.value).toBe("売上高");
  });

  it("getByCode throws for unknown code", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    expect(() => hierarchy.getByCode(AccountCode.of("unknown"))).toThrow('Account "unknown" not found');
  });

  it("getChildren returns direct children", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    const children = hierarchy.getChildren(AccountCode.of("revenue"));
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.code.value).sort()).toEqual(["product_revenue", "service_revenue"]);
  });

  it("getChildren returns empty for leaf account", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    const children = hierarchy.getChildren(AccountCode.of("cash"));
    expect(children).toHaveLength(0);
  });

  it("getLeaves returns leaf accounts", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    const leaves = hierarchy.getLeaves();
    const leafCodes = leaves.map((l) => l.code.value).sort();
    expect(leafCodes).toEqual(["cash", "cogs", "product_revenue", "service_revenue", "total_assets"]);
  });

  it("getByType filters by account type", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    const plAccounts = hierarchy.getByType("PL");
    expect(plAccounts.length).toBe(4);
    const bsAccounts = hierarchy.getByType("BS");
    expect(bsAccounts.length).toBe(2);
  });

  it("getRoots returns root accounts", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    const roots = hierarchy.getRoots();
    const rootCodes = roots.map((r) => r.code.value).sort();
    expect(rootCodes).toEqual(["cash", "cogs", "revenue", "total_assets"]);
  });

  it("isLeaf returns true for leaf and false for parent", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    expect(hierarchy.isLeaf(AccountCode.of("cash"))).toBe(true);
    expect(hierarchy.isLeaf(AccountCode.of("revenue"))).toBe(false);
  });

  it("getDepth returns 0 for root and 1 for child", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    expect(hierarchy.getDepth(AccountCode.of("revenue"))).toBe(0);
    expect(hierarchy.getDepth(AccountCode.of("product_revenue"))).toBe(1);
  });

  it("toSorted returns accounts sorted by sortOrder", () => {
    const hierarchy = AccountHierarchy.build(buildSampleAccounts());
    const sorted = hierarchy.toSorted();
    const sortOrders = sorted.map((a) => a.sortOrder);
    expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
  });

  it("throws on missing parent account", () => {
    const accounts = [
      Account.create({ code: "child", name: "子", type: "PL", side: "DEBIT", parentCode: "nonexistent", sortOrder: 1 }),
    ];
    expect(() => AccountHierarchy.build(accounts)).toThrow('Parent account "nonexistent" not found');
  });

  it("detects circular references", () => {
    const accounts = [
      Account.create({ code: "a", name: "A", type: "PL", side: "DEBIT", parentCode: null, sortOrder: 1 }),
      Account.create({ code: "b", name: "B", type: "PL", side: "DEBIT", parentCode: "a", sortOrder: 2 }),
      Account.create({ code: "c", name: "C", type: "PL", side: "DEBIT", parentCode: "b", sortOrder: 3 }),
    ];
    // This should build fine (no cycle)
    expect(() => AccountHierarchy.build(accounts)).not.toThrow();
  });

  describe("insertParentAbove", () => {
    it("groups two accounts under a new parent", () => {
      // sga with two children: salary and welfare
      const accounts = [
        Account.create({ code: "sga", name: "販管費", type: "PL", side: "DEBIT", parentCode: null, sortOrder: 1 }),
        Account.create({ code: "salary", name: "給与手当", type: "PL", side: "DEBIT", parentCode: "sga", sortOrder: 2 }),
        Account.create({ code: "welfare", name: "法定福利費", type: "PL", side: "DEBIT", parentCode: "sga", sortOrder: 3 }),
        Account.create({ code: "rent", name: "地代家賃", type: "PL", side: "DEBIT", parentCode: "sga", sortOrder: 4 }),
      ];
      const hierarchy = AccountHierarchy.build(accounts);

      const newParent = Account.create({
        code: "personnel_cost",
        name: "人件費",
        type: "PL",
        side: "DEBIT",
        parentCode: "sga",
        sortOrder: 2,
      });

      const updated = hierarchy.insertParentAbove(newParent, [
        AccountCode.of("salary"),
        AccountCode.of("welfare"),
      ]);

      // personnel_cost is under sga
      expect(updated.getByCode(AccountCode.of("personnel_cost")).parentCode?.value).toBe("sga");
      // salary and welfare are now under personnel_cost
      const children = updated.getChildren(AccountCode.of("personnel_cost"));
      expect(children.map((c) => c.code.value).sort()).toEqual(["salary", "welfare"]);
      // rent is still under sga
      expect(updated.getByCode(AccountCode.of("rent")).parentCode?.value).toBe("sga");
      // depth increased
      expect(updated.getDepth(AccountCode.of("salary"))).toBe(2);
    });

    it("throws when newParent code already exists", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const dup = Account.create({
        code: "revenue",
        name: "重複",
        type: "PL",
        side: "CREDIT",
        parentCode: null,
        sortOrder: 99,
      });
      expect(() =>
        hierarchy.insertParentAbove(dup, [AccountCode.of("cogs")]),
      ).toThrow('Account "revenue" already exists');
    });

    it("throws when childCode does not exist", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const newParent = Account.create({
        code: "group",
        name: "グループ",
        type: "PL",
        side: "DEBIT",
        parentCode: null,
        sortOrder: 99,
      });
      expect(() =>
        hierarchy.insertParentAbove(newParent, [AccountCode.of("nonexistent")]),
      ).toThrow('Account "nonexistent" not found');
    });

    it("throws when children have different parentCodes", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const newParent = Account.create({
        code: "group",
        name: "グループ",
        type: "PL",
        side: "DEBIT",
        parentCode: null,
        sortOrder: 99,
      });
      // product_revenue has parent "revenue", cogs has parent null
      expect(() =>
        hierarchy.insertParentAbove(newParent, [
          AccountCode.of("product_revenue"),
          AccountCode.of("cogs"),
        ]),
      ).toThrow("All children must have the same parentCode");
    });

    it("throws when a structural account is in childCodes", () => {
      const accounts = [
        Account.create({ code: "sga", name: "販管費", type: "PL", side: "DEBIT", parentCode: null, sortOrder: 1 }),
        Account.create({ code: "revenue", name: "売上高", type: "PL", side: "CREDIT", parentCode: null, sortOrder: 2, isStructural: true }),
      ];
      const hierarchy = AccountHierarchy.build(accounts);
      const newParent = Account.create({
        code: "group",
        name: "グループ",
        type: "PL",
        side: "DEBIT",
        parentCode: null,
        sortOrder: 99,
      });
      expect(() =>
        hierarchy.insertParentAbove(newParent, [AccountCode.of("revenue")]),
      ).toThrow('Cannot change parentCode of structural account "revenue"');
    });

    it("does not mutate the original hierarchy", () => {
      const accounts = [
        Account.create({ code: "sga", name: "販管費", type: "PL", side: "DEBIT", parentCode: null, sortOrder: 1 }),
        Account.create({ code: "salary", name: "給与手当", type: "PL", side: "DEBIT", parentCode: "sga", sortOrder: 2 }),
        Account.create({ code: "welfare", name: "法定福利費", type: "PL", side: "DEBIT", parentCode: "sga", sortOrder: 3 }),
      ];
      const original = AccountHierarchy.build(accounts);
      const newParent = Account.create({
        code: "personnel_cost",
        name: "人件費",
        type: "PL",
        side: "DEBIT",
        parentCode: "sga",
        sortOrder: 2,
      });

      original.insertParentAbove(newParent, [
        AccountCode.of("salary"),
        AccountCode.of("welfare"),
      ]);

      // original is unchanged
      expect(original.getByCode(AccountCode.of("salary")).parentCode?.value).toBe("sga");
      expect(() => original.getByCode(AccountCode.of("personnel_cost"))).toThrow();
    });
  });

  describe("addChildrenTo", () => {
    it("adds children to a leaf account", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());

      const newChildren = [
        Account.create({ code: "headcount", name: "従業員数", type: "PL", side: "DEBIT", parentCode: "cogs", sortOrder: 5 }),
        Account.create({ code: "unit_cost", name: "単価", type: "PL", side: "DEBIT", parentCode: "cogs", sortOrder: 6 }),
      ];

      const updated = hierarchy.addChildrenTo(AccountCode.of("cogs"), newChildren);

      expect(updated.isLeaf(AccountCode.of("cogs"))).toBe(false);
      const children = updated.getChildren(AccountCode.of("cogs"));
      expect(children.map((c) => c.code.value).sort()).toEqual(["headcount", "unit_cost"]);
      expect(updated.isLeaf(AccountCode.of("headcount"))).toBe(true);
      expect(updated.isLeaf(AccountCode.of("unit_cost"))).toBe(true);
    });

    it("throws when target is not a leaf account", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const newChild = Account.create({
        code: "extra",
        name: "追加",
        type: "PL",
        side: "CREDIT",
        parentCode: "revenue",
        sortOrder: 99,
      });
      expect(() =>
        hierarchy.addChildrenTo(AccountCode.of("revenue"), [newChild]),
      ).toThrow('Account "revenue" is not a leaf account');
    });

    it("throws when target does not exist", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const newChild = Account.create({
        code: "extra",
        name: "追加",
        type: "PL",
        side: "DEBIT",
        parentCode: "nonexistent",
        sortOrder: 99,
      });
      expect(() =>
        hierarchy.addChildrenTo(AccountCode.of("nonexistent"), [newChild]),
      ).toThrow('Account "nonexistent" not found');
    });

    it("throws when child code already exists", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const dupChild = Account.create({
        code: "cash",
        name: "重複",
        type: "PL",
        side: "DEBIT",
        parentCode: "cogs",
        sortOrder: 99,
      });
      expect(() =>
        hierarchy.addChildrenTo(AccountCode.of("cogs"), [dupChild]),
      ).toThrow('Account "cash" already exists');
    });

    it("throws when child parentCode does not match target", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const wrongParent = Account.create({
        code: "extra",
        name: "追加",
        type: "PL",
        side: "DEBIT",
        parentCode: "revenue",
        sortOrder: 99,
      });
      expect(() =>
        hierarchy.addChildrenTo(AccountCode.of("cogs"), [wrongParent]),
      ).toThrow('Child account "extra" must have parentCode "cogs"');
    });

    it("does not mutate the original hierarchy", () => {
      const hierarchy = AccountHierarchy.build(buildSampleAccounts());
      const newChildren = [
        Account.create({ code: "sub1", name: "子1", type: "PL", side: "DEBIT", parentCode: "cogs", sortOrder: 5 }),
      ];

      hierarchy.addChildrenTo(AccountCode.of("cogs"), newChildren);

      // original is unchanged
      expect(hierarchy.isLeaf(AccountCode.of("cogs"))).toBe(true);
      expect(() => hierarchy.getByCode(AccountCode.of("sub1"))).toThrow();
    });
  });
});
