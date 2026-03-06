import type { AccountCode } from "../account";
import type { Money } from "../money";
import type { Period } from "../period";
import type { EvaluationCache } from "./EvaluationCache";

export interface FormulaNode {
  readonly nodeId: string;
  evaluate(cache: EvaluationCache): Money;
  getDependencies(): FormulaNodeRef[];
}

export interface FormulaNodeRef {
  readonly accountCode: AccountCode;
  readonly period: Period;
  readonly nodeId: string;
}

export class FormulaNodeRefImpl implements FormulaNodeRef {
  readonly nodeId: string;

  constructor(
    readonly accountCode: AccountCode,
    readonly period: Period,
  ) {
    this.nodeId = `${accountCode.value}:${period.toKey()}`;
    Object.freeze(this);
  }
}

export class ConstantNode implements FormulaNode {
  constructor(
    readonly nodeId: string,
    private readonly value: Money,
  ) {
    Object.freeze(this);
  }

  evaluate(cache: EvaluationCache): Money {
    if (cache.has(this.nodeId)) {
      return cache.get(this.nodeId)!;
    }
    cache.set(this.nodeId, this.value);
    return this.value;
  }

  getDependencies(): FormulaNodeRef[] {
    return [];
  }
}

export class AddNode implements FormulaNode {
  constructor(
    readonly nodeId: string,
    private readonly operands: FormulaNodeRef[],
  ) {
    Object.freeze(this);
  }

  evaluate(cache: EvaluationCache): Money {
    if (cache.has(this.nodeId)) {
      return cache.get(this.nodeId)!;
    }
    const result = this.operands.reduce<Money | null>((sum, ref) => {
      const val = this.resolveAndEvaluate(ref, cache);
      return sum === null ? val : sum.add(val);
    }, null);
    const value = result ?? this.zeroMoney(cache);
    cache.set(this.nodeId, value);
    return value;
  }

  getDependencies(): FormulaNodeRef[] {
    return [...this.operands];
  }

  private resolveAndEvaluate(
    ref: FormulaNodeRef,
    cache: EvaluationCache,
  ): Money {
    const node = cache.get(ref.nodeId);
    if (node !== undefined) {
      return node;
    }
    throw new Error(
      `Node ${ref.nodeId} has not been evaluated yet. Ensure topological order.`,
    );
  }

  private zeroMoney(_cache: EvaluationCache): Money {
    // Import Money dynamically would create coupling; use a zero constant via operand pattern
    // If no operands, this is a degenerate case. Return the first operand evaluated or throw.
    throw new Error("AddNode requires at least one operand");
  }
}

export class SubtractNode implements FormulaNode {
  constructor(
    readonly nodeId: string,
    private readonly minuend: FormulaNodeRef,
    private readonly subtrahend: FormulaNodeRef,
  ) {
    Object.freeze(this);
  }

  evaluate(cache: EvaluationCache): Money {
    if (cache.has(this.nodeId)) {
      return cache.get(this.nodeId)!;
    }
    const minuendValue = this.getEvaluated(this.minuend, cache);
    const subtrahendValue = this.getEvaluated(this.subtrahend, cache);
    const result = minuendValue.subtract(subtrahendValue);
    cache.set(this.nodeId, result);
    return result;
  }

  getDependencies(): FormulaNodeRef[] {
    return [this.minuend, this.subtrahend];
  }

  private getEvaluated(ref: FormulaNodeRef, cache: EvaluationCache): Money {
    const value = cache.get(ref.nodeId);
    if (value !== undefined) {
      return value;
    }
    throw new Error(
      `Node ${ref.nodeId} has not been evaluated yet. Ensure topological order.`,
    );
  }
}

export class MultiplyNode implements FormulaNode {
  constructor(
    readonly nodeId: string,
    private readonly base: FormulaNodeRef,
    private readonly factor: number,
  ) {
    Object.freeze(this);
  }

  evaluate(cache: EvaluationCache): Money {
    if (cache.has(this.nodeId)) {
      return cache.get(this.nodeId)!;
    }
    const baseValue = cache.get(this.base.nodeId);
    if (baseValue === undefined) {
      throw new Error(
        `Node ${this.base.nodeId} has not been evaluated yet. Ensure topological order.`,
      );
    }
    const result = baseValue.multiply(this.factor);
    cache.set(this.nodeId, result);
    return result;
  }

  getDependencies(): FormulaNodeRef[] {
    return [this.base];
  }
}

export class ReferenceNode implements FormulaNode {
  constructor(
    readonly nodeId: string,
    private readonly ref: FormulaNodeRef,
  ) {
    Object.freeze(this);
  }

  evaluate(cache: EvaluationCache): Money {
    if (cache.has(this.nodeId)) {
      return cache.get(this.nodeId)!;
    }
    const value = cache.get(this.ref.nodeId);
    if (value === undefined) {
      throw new Error(
        `Node ${this.ref.nodeId} has not been evaluated yet. Ensure topological order.`,
      );
    }
    cache.set(this.nodeId, value);
    return value;
  }

  getDependencies(): FormulaNodeRef[] {
    return [this.ref];
  }
}

export class NegateNode implements FormulaNode {
  constructor(
    readonly nodeId: string,
    private readonly operand: FormulaNodeRef,
  ) {
    Object.freeze(this);
  }

  evaluate(cache: EvaluationCache): Money {
    if (cache.has(this.nodeId)) {
      return cache.get(this.nodeId)!;
    }
    const value = cache.get(this.operand.nodeId);
    if (value === undefined) {
      throw new Error(
        `Node ${this.operand.nodeId} has not been evaluated yet. Ensure topological order.`,
      );
    }
    const result = value.negate();
    cache.set(this.nodeId, result);
    return result;
  }

  getDependencies(): FormulaNodeRef[] {
    return [this.operand];
  }
}
