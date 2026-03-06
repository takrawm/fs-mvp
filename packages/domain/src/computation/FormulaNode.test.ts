import { describe, it, expect } from "vitest";
import { AccountCode } from "../account";
import { Money } from "../money";
import { Period } from "../period";
import { EvaluationCache } from "./EvaluationCache";
import {
  ConstantNode,
  AddNode,
  SubtractNode,
  MultiplyNode,
  ReferenceNode,
  NegateNode,
  FormulaNodeRefImpl,
} from "./FormulaNode";

function ref(code: string, fy: number, month: number) {
  return new FormulaNodeRefImpl(AccountCode.of(code), Period.of(fy, month));
}

describe("FormulaNodeRefImpl", () => {
  it("generates nodeId from accountCode and period", () => {
    const r = ref("revenue", 2024, 4);
    expect(r.nodeId).toBe("revenue:2024-04");
  });

  it("is immutable", () => {
    const r = ref("revenue", 2024, 4);
    expect(() => {
      (r as unknown as Record<string, unknown>).nodeId = "x";
    }).toThrow();
  });
});

describe("ConstantNode", () => {
  it("returns the constant value", () => {
    const cache = new EvaluationCache();
    const node = new ConstantNode("a:2024-04", Money.of(1000));
    expect(node.evaluate(cache).amount).toBe(1000);
  });

  it("caches the result", () => {
    const cache = new EvaluationCache();
    const node = new ConstantNode("a:2024-04", Money.of(1000));
    node.evaluate(cache);
    expect(cache.has("a:2024-04")).toBe(true);
    expect(cache.get("a:2024-04")!.amount).toBe(1000);
  });

  it("returns cached value on second call", () => {
    const cache = new EvaluationCache();
    const node = new ConstantNode("a:2024-04", Money.of(1000));
    const first = node.evaluate(cache);
    const second = node.evaluate(cache);
    expect(first.amount).toBe(second.amount);
  });

  it("has no dependencies", () => {
    const node = new ConstantNode("a:2024-04", Money.of(1000));
    expect(node.getDependencies()).toEqual([]);
  });
});

describe("AddNode", () => {
  it("sums two operands", () => {
    const cache = new EvaluationCache();
    cache.set("a:2024-04", Money.of(1000));
    cache.set("b:2024-04", Money.of(500));

    const node = new AddNode("sum:2024-04", [
      ref("a", 2024, 4),
      ref("b", 2024, 4),
    ]);
    expect(node.evaluate(cache).amount).toBe(1500);
  });

  it("sums three operands", () => {
    const cache = new EvaluationCache();
    cache.set("a:2024-04", Money.of(100));
    cache.set("b:2024-04", Money.of(200));
    cache.set("c:2024-04", Money.of(300));

    const node = new AddNode("sum:2024-04", [
      ref("a", 2024, 4),
      ref("b", 2024, 4),
      ref("c", 2024, 4),
    ]);
    expect(node.evaluate(cache).amount).toBe(600);
  });

  it("throws if operand not evaluated", () => {
    const cache = new EvaluationCache();
    const node = new AddNode("sum:2024-04", [ref("a", 2024, 4)]);
    expect(() => node.evaluate(cache)).toThrow("has not been evaluated yet");
  });

  it("throws if no operands", () => {
    const cache = new EvaluationCache();
    const node = new AddNode("sum:2024-04", []);
    expect(() => node.evaluate(cache)).toThrow("at least one operand");
  });

  it("returns dependencies", () => {
    const deps = [ref("a", 2024, 4), ref("b", 2024, 4)];
    const node = new AddNode("sum:2024-04", deps);
    expect(node.getDependencies()).toHaveLength(2);
  });
});

describe("SubtractNode", () => {
  it("subtracts subtrahend from minuend", () => {
    const cache = new EvaluationCache();
    cache.set("a:2024-04", Money.of(1000));
    cache.set("b:2024-04", Money.of(300));

    const node = new SubtractNode(
      "diff:2024-04",
      ref("a", 2024, 4),
      ref("b", 2024, 4),
    );
    expect(node.evaluate(cache).amount).toBe(700);
  });

  it("throws if minuend not evaluated", () => {
    const cache = new EvaluationCache();
    cache.set("b:2024-04", Money.of(300));
    const node = new SubtractNode(
      "diff:2024-04",
      ref("a", 2024, 4),
      ref("b", 2024, 4),
    );
    expect(() => node.evaluate(cache)).toThrow("has not been evaluated yet");
  });

  it("returns two dependencies", () => {
    const node = new SubtractNode(
      "diff:2024-04",
      ref("a", 2024, 4),
      ref("b", 2024, 4),
    );
    expect(node.getDependencies()).toHaveLength(2);
  });
});

describe("MultiplyNode", () => {
  it("multiplies base by factor", () => {
    const cache = new EvaluationCache();
    cache.set("a:2024-04", Money.of(1000));

    const node = new MultiplyNode("m:2024-04", ref("a", 2024, 4), 1.05);
    expect(node.evaluate(cache).amount).toBeCloseTo(1050);
  });

  it("throws if base not evaluated", () => {
    const cache = new EvaluationCache();
    const node = new MultiplyNode("m:2024-04", ref("a", 2024, 4), 1.05);
    expect(() => node.evaluate(cache)).toThrow("has not been evaluated yet");
  });

  it("returns one dependency", () => {
    const node = new MultiplyNode("m:2024-04", ref("a", 2024, 4), 1.05);
    expect(node.getDependencies()).toHaveLength(1);
  });
});

describe("ReferenceNode", () => {
  it("returns the referenced value", () => {
    const cache = new EvaluationCache();
    cache.set("a:2024-04", Money.of(1000));

    const node = new ReferenceNode("r:2024-04", ref("a", 2024, 4));
    expect(node.evaluate(cache).amount).toBe(1000);
  });

  it("throws if ref not evaluated", () => {
    const cache = new EvaluationCache();
    const node = new ReferenceNode("r:2024-04", ref("a", 2024, 4));
    expect(() => node.evaluate(cache)).toThrow("has not been evaluated yet");
  });
});

describe("NegateNode", () => {
  it("negates the value", () => {
    const cache = new EvaluationCache();
    cache.set("a:2024-04", Money.of(1000));

    const node = new NegateNode("n:2024-04", ref("a", 2024, 4));
    expect(node.evaluate(cache).amount).toBe(-1000);
  });

  it("throws if operand not evaluated", () => {
    const cache = new EvaluationCache();
    const node = new NegateNode("n:2024-04", ref("a", 2024, 4));
    expect(() => node.evaluate(cache)).toThrow("has not been evaluated yet");
  });
});

describe("cache hit", () => {
  it("returns cached value without recalculation", () => {
    const cache = new EvaluationCache();
    cache.set("a:2024-04", Money.of(1000));
    cache.set("b:2024-04", Money.of(500));

    const node = new AddNode("sum:2024-04", [
      ref("a", 2024, 4),
      ref("b", 2024, 4),
    ]);

    const first = node.evaluate(cache);
    // Modify cache for dependency - shouldn't affect cached result
    cache.set("a:2024-04", Money.of(9999));
    const second = node.evaluate(cache);

    expect(first.amount).toBe(1500);
    expect(second.amount).toBe(1500);
  });
});
