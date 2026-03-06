import { describe, it, expect } from "vitest";
import { AccountCode } from "../account";
import { Money } from "../money";
import { Period } from "../period";
import { ConstantNode, FormulaNodeRefImpl, AddNode } from "./FormulaNode";
import { NodeRegistry } from "./NodeRegistry";
import { DependencyGraph } from "./DependencyGraph";

function makeRef(code: string, fy: number, month: number) {
  return new FormulaNodeRefImpl(AccountCode.of(code), Period.of(fy, month));
}

function makeConstant(code: string, fy: number, month: number, amount: number) {
  const nodeId = `${code}:${Period.of(fy, month).toKey()}`;
  return new ConstantNode(nodeId, Money.of(amount));
}

describe("DependencyGraph", () => {
  it("sorts independent nodes", () => {
    const registry = new NodeRegistry();
    registry.register(makeConstant("a", 2024, 4, 100));
    registry.register(makeConstant("b", 2024, 4, 200));

    const graph = DependencyGraph.build(registry);
    const sorted = graph.topologicalSort();

    expect(sorted).toHaveLength(2);
  });

  it("sorts dependent nodes in correct order (dependency first)", () => {
    const registry = new NodeRegistry();

    const nodeC = makeConstant("c", 2024, 4, 100);
    const nodeB = makeConstant("b", 2024, 4, 200);
    const nodeA = new AddNode("a:2024-04", [
      makeRef("b", 2024, 4),
      makeRef("c", 2024, 4),
    ]);

    registry.register(nodeA);
    registry.register(nodeB);
    registry.register(nodeC);

    const graph = DependencyGraph.build(registry);
    const sorted = graph.topologicalSort();

    const indexA = sorted.findIndex((n) => n.nodeId === "a:2024-04");
    const indexB = sorted.findIndex((n) => n.nodeId === "b:2024-04");
    const indexC = sorted.findIndex((n) => n.nodeId === "c:2024-04");

    expect(indexB).toBeLessThan(indexA);
    expect(indexC).toBeLessThan(indexA);
  });

  it("sorts a chain A -> B -> C correctly", () => {
    const registry = new NodeRegistry();

    const nodeC = makeConstant("c", 2024, 4, 100);
    const nodeB = new AddNode("b:2024-04", [makeRef("c", 2024, 4)]);
    const nodeA = new AddNode("a:2024-04", [makeRef("b", 2024, 4)]);

    registry.register(nodeA);
    registry.register(nodeB);
    registry.register(nodeC);

    const graph = DependencyGraph.build(registry);
    const sorted = graph.topologicalSort();

    const ids = sorted.map((n) => n.nodeId);
    expect(ids.indexOf("c:2024-04")).toBeLessThan(ids.indexOf("b:2024-04"));
    expect(ids.indexOf("b:2024-04")).toBeLessThan(ids.indexOf("a:2024-04"));
  });

  it("detects a cycle", () => {
    const registry = new NodeRegistry();

    // A depends on B, B depends on A → cycle
    const nodeA = new AddNode("a:2024-04", [makeRef("b", 2024, 4)]);
    const nodeB = new AddNode("b:2024-04", [makeRef("a", 2024, 4)]);

    registry.register(nodeA);
    registry.register(nodeB);

    const graph = DependencyGraph.build(registry);
    const cycle = graph.detectCycle();

    expect(cycle).not.toBeNull();
    expect(cycle).toContain("a:2024-04");
    expect(cycle).toContain("b:2024-04");
  });

  it("throws on topologicalSort when cycle exists", () => {
    const registry = new NodeRegistry();

    const nodeA = new AddNode("a:2024-04", [makeRef("b", 2024, 4)]);
    const nodeB = new AddNode("b:2024-04", [makeRef("a", 2024, 4)]);

    registry.register(nodeA);
    registry.register(nodeB);

    const graph = DependencyGraph.build(registry);
    expect(() => graph.topologicalSort()).toThrow("Circular dependency");
  });

  it("returns null from detectCycle when no cycle", () => {
    const registry = new NodeRegistry();
    registry.register(makeConstant("a", 2024, 4, 100));
    registry.register(makeConstant("b", 2024, 4, 200));

    const graph = DependencyGraph.build(registry);
    expect(graph.detectCycle()).toBeNull();
  });
});
