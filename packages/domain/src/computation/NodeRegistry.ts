import type { AccountCode } from "../account";
import type { Period } from "../period";
import type { FormulaNode } from "./FormulaNode";

export class NodeRegistry {
  private readonly nodes = new Map<string, FormulaNode>();

  static buildNodeId(accountCode: AccountCode, period: Period): string {
    return `${accountCode.value}:${period.toKey()}`;
  }

  register(node: FormulaNode): void {
    if (this.nodes.has(node.nodeId)) {
      throw new Error(`Node ${node.nodeId} is already registered`);
    }
    this.nodes.set(node.nodeId, node);
  }

  get(nodeId: string): FormulaNode {
    const node = this.nodes.get(nodeId);
    if (node === undefined) {
      throw new Error(`Node ${nodeId} is not registered`);
    }
    return node;
  }

  getOrCreate(
    accountCode: AccountCode,
    period: Period,
    factory: () => FormulaNode,
  ): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(accountCode, period);
    const existing = this.nodes.get(nodeId);
    if (existing !== undefined) {
      return existing;
    }
    const node = factory();
    this.nodes.set(nodeId, node);
    return node;
  }

  getAll(): FormulaNode[] {
    return [...this.nodes.values()];
  }

  has(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }
}
