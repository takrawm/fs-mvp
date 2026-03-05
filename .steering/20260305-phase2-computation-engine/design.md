# Phase 2: 計算エンジン — 設計

**対象:** computation パッケージ + rule パッケージの実装
**日付:** 2026-03-05

---

## 1. 実装アプローチ

### 1.1 基本方針

computation パッケージと rule パッケージは相互に関連するが、パッケージ参照方向（`rule → computation` ではなく `computation → rule`）を守るため、以下の順序で実装する。

```
Step 1: FormulaNode 階層 + EvaluationCache（computation 内、他パッケージ非依存の基盤）
Step 2: NodeRegistry + DependencyGraph（computation 内、FormulaNode に依存）
Step 3: Rule インターフェース + RuleBuildContext（rule パッケージ、computation の FormulaNode を参照）
Step 4: 7 種の Rule 実装（rule パッケージ）
Step 5: AstEngine（computation 内、rule パッケージを参照して統合）
```

### 1.2 パッケージ参照方向

```
account ──┐
period ───┼──→ rule ──→ computation
money ────┘          ↗
      └─────────────┘
```

- rule パッケージは account, period, money, computation の FormulaNode 型を参照する
- computation パッケージは account, period, money, rule を参照する
- computation 内の FormulaNode / EvaluationCache / NodeRegistry / DependencyGraph は rule に依存しない
- AstEngine のみが rule パッケージに依存する

### 1.3 循環依存の回避

rule パッケージは computation の FormulaNode 型を参照し、computation の AstEngine は rule の Rule 型を参照する。これは循環参照に見えるが、以下の構造で回避する：

- `FormulaNode`, `FormulaNodeRef`, `EvaluationCache` は computation パッケージ内の独立モジュール
- rule パッケージはこれらの「型」のみをインポートする
- AstEngine は rule パッケージの `Rule` インターフェースをインポートする
- パッケージレベルでは `rule → computation` の一方向参照が成立する（AstEngine が rule を使う側）

実際のインポート方向:
```
rule/ManualInputRule.ts → computation/FormulaNode.ts（FormulaNode 型のみ）
computation/AstEngine.ts → rule/Rule.ts（Rule インターフェース）
```

## 2. ファイル構成と実装順序

### 2.1 computation パッケージ

```
packages/domain/src/computation/
├── FormulaNode.ts           # [Step 1] インターフェース + 6 種の具体ノード
├── FormulaNode.test.ts      # [Step 1] 各ノードの evaluate() テスト
├── EvaluationCache.ts       # [Step 1] メモ化キャッシュ
├── NodeRegistry.ts          # [Step 2] ノード管理 + ID 生成
├── DependencyGraph.ts       # [Step 2] トポロジカルソート + 循環検出
├── DependencyGraph.test.ts  # [Step 2] ソート順・循環エラーのテスト
├── AstEngine.ts             # [Step 5] 計算実行エンジン
├── AstEngine.test.ts        # [Step 5] 統合テスト
└── index.ts                 # エクスポート
```

### 2.2 rule パッケージ

```
packages/domain/src/rule/
├── Rule.ts                  # [Step 3] Rule インターフェース + RuleType
├── RuleBuildContext.ts       # [Step 3] ルール構築コンテキスト
├── ManualInputRule.ts        # [Step 4]
├── ManualInputRule.test.ts   # [Step 4]
├── GrowthRateRule.ts         # [Step 4]
├── GrowthRateRule.test.ts    # [Step 4]
├── PercentageRule.ts         # [Step 4]
├── PercentageRule.test.ts    # [Step 4]
├── ReferenceRule.ts          # [Step 4]
├── ReferenceRule.test.ts     # [Step 4]
├── BalanceChangeRule.ts      # [Step 4]
├── BalanceChangeRule.test.ts # [Step 4]
├── SumRule.ts                # [Step 4]
├── SumRule.test.ts           # [Step 4]
├── SubtractRule.ts           # [Step 4]
├── SubtractRule.test.ts      # [Step 4]
└── index.ts                 # エクスポート
```

## 3. コンポーネント設計

### 3.1 FormulaNode 階層

#### nodeId の命名規則

`NodeRegistry.buildNodeId()` が生成する ID 形式:

```
{accountCode}:{fiscalYear}-{month(2桁)}
```

例: `revenue:2024-04`, `cogs:2025-01`

これは `Period.toKey()` の出力と `AccountCode.value` を組み合わせたもの。

#### FormulaNode インターフェース

```typescript
interface FormulaNode {
  readonly nodeId: string;
  evaluate(cache: EvaluationCache): Money;
  getDependencies(): FormulaNodeRef[];
}
```

#### FormulaNodeRef インターフェース

他ノードへの遅延参照。ノード構築時点では参照先が未登録の場合があるため、`resolve()` で実体を取得する。

```typescript
interface FormulaNodeRef {
  readonly accountCode: AccountCode;
  readonly period: Period;
  resolve(registry: NodeRegistry): FormulaNode;
}
```

実装は単純なデータクラス:

```typescript
class FormulaNodeRefImpl implements FormulaNodeRef {
  constructor(
    readonly accountCode: AccountCode,
    readonly period: Period,
  ) {}

  resolve(registry: NodeRegistry): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, this.period);
    return registry.get(nodeId);
  }
}
```

#### 具体ノードの evaluate() 実装パターン

全ノードで共通のキャッシュ参照パターンを適用:

```typescript
evaluate(cache: EvaluationCache): Money {
  if (cache.has(this.nodeId)) {
    return cache.get(this.nodeId)!;
  }
  const result = /* ノード固有の計算 */;
  cache.set(this.nodeId, result);
  return result;
}
```

#### 各ノードの計算ロジック

| ノード | 計算 | 依存 |
|--------|------|------|
| ConstantNode | `value` をそのまま返す | なし |
| AddNode | `operands.reduce((sum, ref) => sum.add(ref.resolve().evaluate(cache)))` | operands |
| SubtractNode | `minuend.evaluate(cache).subtract(subtrahend.evaluate(cache))` | minuend, subtrahend |
| MultiplyNode | `base.resolve().evaluate(cache).multiply(factor)` | base |
| ReferenceNode | `ref.resolve().evaluate(cache)` | ref |
| NegateNode | `operand.resolve().evaluate(cache).negate()` | operand |

### 3.2 EvaluationCache

シンプルな Map ラッパー。Phase 4 での永続キャッシュ拡張を阻害しないよう、インターフェースを分離可能な設計にしておく（ただし Phase 2 では具象クラスのみ）。

```typescript
class EvaluationCache {
  private readonly cache = new Map<string, Money>();

  get(nodeId: string): Money | undefined;
  set(nodeId: string, value: Money): void;
  has(nodeId: string): boolean;
  clear(): void;
}
```

### 3.3 NodeRegistry

全 FormulaNode を Map で管理。`getOrCreate()` は SumRule 等で子ノードを参照する際に、まだ未構築のノードをオンデマンドで生成するために使用する。

```typescript
class NodeRegistry {
  private readonly nodes = new Map<string, FormulaNode>();

  register(node: FormulaNode): void;             // nodeId 重複はエラー
  get(nodeId: string): FormulaNode;               // 未登録はエラー
  getOrCreate(
    accountCode: AccountCode,
    period: Period,
    factory: () => FormulaNode,
  ): FormulaNode;
  getAll(): FormulaNode[];
  has(nodeId: string): boolean;

  static buildNodeId(accountCode: AccountCode, period: Period): string {
    return `${accountCode.value}:${period.toKey()}`;
  }
}
```

### 3.4 DependencyGraph

Kahn のアルゴリズムによるトポロジカルソートを実装。

```typescript
class DependencyGraph {
  private constructor(
    private readonly adjacencyList: ReadonlyMap<string, string[]>,
    private readonly inDegree: Map<string, number>,
    private readonly registry: NodeRegistry,
  );

  static build(registry: NodeRegistry): DependencyGraph;

  topologicalSort(): FormulaNode[];
  detectCycle(): AccountCode[] | null;
}
```

**アルゴリズム:**

1. `build()`: 全ノードの `getDependencies()` を走査し、隣接リストと入次数マップを構築
2. `topologicalSort()`:
   - 入次数 0 のノードをキューに投入
   - キューからノードを取り出し、結果配列に追加
   - 隣接ノードの入次数をデクリメントし、0 になればキューに追加
   - 全ノードが結果に含まれなければ循環あり
3. `detectCycle()`: トポロジカルソートで処理できなかったノードの AccountCode を抽出

### 3.5 Rule インターフェースと RuleBuildContext

```typescript
interface Rule {
  readonly accountCode: AccountCode;
  readonly ruleType: RuleType;
  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode;
}

type RuleType =
  | "MANUAL_INPUT"
  | "GROWTH_RATE"
  | "PERCENTAGE"
  | "REFERENCE"
  | "BALANCE_CHANGE"
  | "SUM"
  | "SUBTRACT";

interface RuleBuildContext {
  getNodeRef(accountCode: AccountCode, period: Period): FormulaNodeRef;
  getHierarchy(): AccountHierarchy;
}
```

`RuleBuildContext` は AstEngine が実装し、ルール構築時に注入する。これにより Rule は NodeRegistry の詳細を知らずにノード参照を取得できる。

### 3.6 各 Rule の実装設計

#### ManualInputRule

```typescript
class ManualInputRule implements Rule {
  readonly ruleType = "MANUAL_INPUT" as const;
  constructor(
    readonly accountCode: AccountCode,
    private readonly value: Money,
  ) {}

  buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
    const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
    return new ConstantNode(nodeId, this.value);
  }
}
```

#### GrowthRateRule

前期の同一科目の値に `(1 + rate)` を掛ける。

```typescript
buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
  const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
  const prevRef = context.getNodeRef(this.accountCode, period.prev());
  return new MultiplyNode(nodeId, prevRef, 1 + this.growthRate.rate);
}
```

**注意:** 予測1期目の `period.prev()` は実績最終月を指す。この期間の ConstantNode は AstEngine が事前に登録済みであるため、参照解決時に正しく取得できる。

#### PercentageRule

参照科目の同期間の値に `ratio` を掛ける。

```typescript
buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
  const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
  const baseRef = context.getNodeRef(this.referenceAccount, period);
  return new MultiplyNode(nodeId, baseRef, this.ratio.value);
}
```

#### ReferenceRule

参照科目の値をそのまま使う。`referencePeriodOffset` で前期（-1）等にも対応。

```typescript
buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
  const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
  let targetPeriod = period;
  for (let i = 0; i < Math.abs(this.referencePeriodOffset); i++) {
    targetPeriod = this.referencePeriodOffset < 0
      ? targetPeriod.prev()
      : targetPeriod.next();
  }
  const ref = context.getNodeRef(this.referenceAccount, targetPeriod);
  return new ReferenceNode(nodeId, ref);
}
```

#### BalanceChangeRule

BS 科目の残高 = 前期残高 + 当期変動額。

```typescript
buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
  const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
  const prevBalanceRef = context.getNodeRef(this.accountCode, period.prev());
  const changeRef = context.getNodeRef(this.changeSourceAccount, period);
  return new AddNode(nodeId, [prevBalanceRef, changeRef]);
}
```

#### SumRule

AccountHierarchy から子科目を取得し、全子科目の同期間ノードを合算する。

```typescript
buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
  const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
  const hierarchy = context.getHierarchy();
  const children = hierarchy.getChildren(this.accountCode);
  const childRefs = children.map(child =>
    context.getNodeRef(child.code, period)
  );
  return new AddNode(nodeId, childRefs);
}
```

#### SubtractRule

```typescript
buildFormulaNode(period: Period, context: RuleBuildContext): FormulaNode {
  const nodeId = NodeRegistry.buildNodeId(this.accountCode, period);
  const minuendRef = context.getNodeRef(this.minuend, period);
  const subtrahendRef = context.getNodeRef(this.subtrahend, period);
  return new SubtractNode(nodeId, minuendRef, subtrahendRef);
}
```

### 3.7 AstEngine — 実績値保護と計算フロー

#### registerRules() の処理フロー

```
1. 実績期間の登録（Periods.getActuals() でループ）
   ├── 各実績値（accountCode + period → Money）を ConstantNode として NodeRegistry に登録
   └── ルールは適用しない

2. 予測期間の登録（Periods.getForecasts() でループ）
   ├── 各科目の Rule.buildFormulaNode(period, context) を呼び出し
   └── 生成された FormulaNode を NodeRegistry に登録
```

#### compute() の処理フロー

```
1. EvaluationCache.clear()
2. DependencyGraph.build(registry)
3. DependencyGraph.detectCycle() → 循環があれば errors に追加して終了
4. DependencyGraph.topologicalSort() → 計算順序を取得
5. 順序通りに各ノードの evaluate(cache) を実行
6. ComputationResult { values: cache の内容, errors } を返す
```

#### RuleBuildContext の実装

AstEngine が内部クラスまたはクロージャとして `RuleBuildContext` を実装する:

```typescript
class AstEngine {
  private createBuildContext(hierarchy: AccountHierarchy): RuleBuildContext {
    return {
      getNodeRef: (accountCode, period) =>
        new FormulaNodeRefImpl(accountCode, period),
      getHierarchy: () => hierarchy,
    };
  }
}
```

#### ComputationResult / ComputationError

```typescript
interface ComputationResult {
  readonly values: ReadonlyMap<string, Money>;
  readonly errors: readonly ComputationError[];
}

interface ComputationError {
  readonly accountCode: AccountCode;
  readonly period: Period;
  readonly message: string;
}
```

## 4. テスト設計

### 4.1 FormulaNode テスト

各ノードに対して evaluate() の正常系を検証:

| テストケース | 入力 | 期待値 |
|-------------|------|--------|
| ConstantNode | Money.of(1000) | 1000 |
| AddNode(2 operands) | 1000 + 500 | 1500 |
| SubtractNode | 1000 - 300 | 700 |
| MultiplyNode | 1000 × 1.05 | 1050 |
| ReferenceNode | ref → 1000 | 1000 |
| NegateNode | -1000 | -1000 |
| キャッシュヒット | 2回目の evaluate | 1回目と同値、再計算なし |

### 4.2 DependencyGraph テスト

- **正常系:** A → B → C の依存で `[C, B, A]` 順にソート
- **循環検出:** A → B → C → A で `["A", "B", "C"]` を含むエラー
- **独立ノード:** 依存なしのノードは任意順でソート結果に含まれる

### 4.3 Rule テスト

各ルールの `buildFormulaNode()` が返すノードの型と依存を検証:

| ルール | 返すノード型 | 依存先 |
|--------|-------------|--------|
| ManualInputRule(500) | ConstantNode | なし |
| GrowthRateRule(5%) | MultiplyNode | 同科目・前期 |
| PercentageRule(70%, ref=revenue) | MultiplyNode | revenue・同期 |
| ReferenceRule(ref=revenue, offset=0) | ReferenceNode | revenue・同期 |
| BalanceChangeRule(source=capex_pl) | AddNode | 同科目・前期, capex_pl・同期 |
| SumRule | AddNode | 子科目群・同期 |
| SubtractRule(revenue, cogs) | SubtractNode | revenue・同期, cogs・同期 |

### 4.4 AstEngine 統合テスト

簡易モデル（実績 1 期 + 予測 1 期、5 科目）で計算結果を手計算値と照合:

```
科目構成:
  revenue（売上高）     — GrowthRateRule(5%)
  cogs（売上原価）      — PercentageRule(70%, revenue)
  grossProfit（売上総利益）— SubtractRule(revenue, cogs)
  sga（販管費）          — ManualInputRule(200)
  operatingProfit（営業利益）— SubtractRule(grossProfit, sga)

実績期間（FY2024/4）:
  revenue = 1000
  cogs = 700
  grossProfit = 300
  sga = 200
  operatingProfit = 100

予測期間（FY2024/5）の期待値:
  revenue = 1000 × 1.05 = 1050
  cogs = 1050 × 0.70 = 735
  grossProfit = 1050 - 735 = 315
  sga = 200（手入力）
  operatingProfit = 315 - 200 = 115
```

**検証項目:**
- 予測値が上記の期待値と一致すること
- 実績値（FY2024/4）が compute() 後も変更されないこと
- getValue() で任意の科目・期間の値を取得できること

## 5. 影響範囲

### 5.1 新規作成

- `packages/domain/src/computation/` ディレクトリ（全ファイル新規）
- `packages/domain/src/rule/` ディレクトリ（全ファイル新規）

### 5.2 既存ファイルの変更

- `packages/domain/src/index.ts` — computation と rule のエクスポートを追加

### 5.3 既存コードへの影響

Phase 1 のパッケージ（account, period, money）には変更を加えない。

---

*— End of Document —*
