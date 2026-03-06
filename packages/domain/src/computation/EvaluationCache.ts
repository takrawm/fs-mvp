import type { Money } from "../money";

export class EvaluationCache {
  private readonly cache = new Map<string, Money>();

  get(nodeId: string): Money | undefined {
    return this.cache.get(nodeId);
  }

  set(nodeId: string, value: Money): void {
    this.cache.set(nodeId, value);
  }

  has(nodeId: string): boolean {
    return this.cache.has(nodeId);
  }

  clear(): void {
    this.cache.clear();
  }
}
