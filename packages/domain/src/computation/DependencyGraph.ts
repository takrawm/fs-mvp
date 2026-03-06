import type { FormulaNode } from "./FormulaNode";
import type { NodeRegistry } from "./NodeRegistry";

export class DependencyGraph {
  private constructor(
    private readonly adjacencyList: ReadonlyMap<string, string[]>,
    private readonly inDegreeMap: Map<string, number>,
    private readonly registry: NodeRegistry,
  ) {}

  static build(registry: NodeRegistry): DependencyGraph {
    const nodes = registry.getAll();
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      if (!adjacencyList.has(node.nodeId)) {
        adjacencyList.set(node.nodeId, []);
      }
      if (!inDegree.has(node.nodeId)) {
        inDegree.set(node.nodeId, 0);
      }

      for (const dep of node.getDependencies()) {
        if (!adjacencyList.has(dep.nodeId)) {
          adjacencyList.set(dep.nodeId, []);
        }
        if (!inDegree.has(dep.nodeId)) {
          inDegree.set(dep.nodeId, 0);
        }
        adjacencyList.get(dep.nodeId)!.push(node.nodeId);
        inDegree.set(node.nodeId, inDegree.get(node.nodeId)! + 1);
      }
    }

    return new DependencyGraph(adjacencyList, inDegree, registry);
  }

  topologicalSort(): FormulaNode[] {
    const inDegree = new Map(this.inDegreeMap);
    const queue: string[] = [];

    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const sorted: FormulaNode[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (this.registry.has(current)) {
        sorted.push(this.registry.get(current));
      }

      const neighbors = this.adjacencyList.get(current) ?? [];
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    const totalNodes = inDegree.size;
    // sorted may be fewer than totalNodes if some dependency-only refs aren't registered
    const processedCount = sorted.length + this.countUnregisteredNodes(inDegree);
    if (processedCount < totalNodes) {
      throw new Error("Circular dependency detected");
    }

    return sorted;
  }

  detectCycle(): string[] | null {
    const inDegree = new Map(this.inDegreeMap);
    const queue: string[] = [];

    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      visited.add(current);

      const neighbors = this.adjacencyList.get(current) ?? [];
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    const cycleNodes: string[] = [];
    for (const [nodeId] of inDegree) {
      if (!visited.has(nodeId)) {
        cycleNodes.push(nodeId);
      }
    }

    return cycleNodes.length > 0 ? cycleNodes : null;
  }

  private countUnregisteredNodes(inDegree: Map<string, number>): number {
    let count = 0;
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0 && !this.registry.has(nodeId)) {
        count++;
      }
    }
    return count;
  }
}
