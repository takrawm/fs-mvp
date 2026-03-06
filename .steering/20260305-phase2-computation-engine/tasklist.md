# Phase 2: 計算エンジン — タスクリスト

**対象:** computation パッケージ + rule パッケージの実装
**日付:** 2026-03-05

---

## 凡例

- [x]未着手
- [x] 完了

---

## Step 1: FormulaNode 基盤 + EvaluationCache

### 1.1 EvaluationCache

- [x] `computation/EvaluationCache.ts` を作成（get, set, has, clear）

### 1.2 FormulaNode 階層

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/FormulaNode.ts` | EvaluationCache, account, period, money | インターフェース + FormulaNodeRef + 6 種の具体ノード |
| 2 | `computation/FormulaNode.test.ts` | — | 各ノードの evaluate() テスト |

タスク:
- [x]FormulaNode インターフェースを定義（nodeId, evaluate, getDependencies）
- [x]FormulaNodeRef インターフェース + FormulaNodeRefImpl を実装
- [x]ConstantNode を実装
- [x]AddNode を実装
- [x]SubtractNode を実装
- [x]MultiplyNode を実装
- [x]ReferenceNode を実装
- [x]NegateNode を実装
- [x]全ノードの evaluate() テストを作成（正常系 + キャッシュヒット）

---

## Step 2: NodeRegistry + DependencyGraph

### 2.1 NodeRegistry

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/NodeRegistry.ts` | FormulaNode, account, period | ノード管理 + ID 生成 |

タスク:
- [x]NodeRegistry を実装（register, get, getOrCreate, getAll, has）
- [x]`buildNodeId()` を実装（`{accountCode}:{fiscalYear}-{month}`）

### 2.2 DependencyGraph

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/DependencyGraph.ts` | NodeRegistry, FormulaNode | トポロジカルソート + 循環検出 |
| 2 | `computation/DependencyGraph.test.ts` | — | ソート順・循環エラーのテスト |

タスク:
- [x]DependencyGraph.build() を実装（隣接リスト + 入次数マップの構築）
- [x]topologicalSort() を実装（Kahn のアルゴリズム）
- [x]detectCycle() を実装（未処理ノードから関与する AccountCode を抽出）
- [x]テストを作成（正常ソート + 循環検出 + 独立ノード）

---

## Step 3: Rule インターフェース

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `rule/Rule.ts` | account, computation/FormulaNode | Rule インターフェース + RuleType |
| 2 | `rule/RuleBuildContext.ts` | account, period, computation/FormulaNode | ルール構築コンテキスト |

タスク:
- [x]Rule インターフェースを定義（accountCode, ruleType, buildFormulaNode）
- [x]RuleType を定義（7 種の union 型）
- [x]RuleBuildContext インターフェースを定義（getNodeRef, getHierarchy）

---

## Step 4: Rule 実装（7 種類）

各ルールの実装とテストを行う。

### 4.1 ManualInputRule

- [x]ManualInputRule を実装（→ ConstantNode）
- [x]ManualInputRule のテストを作成

### 4.2 GrowthRateRule

- [x]GrowthRateRule を実装（→ MultiplyNode(prevRef, 1 + rate)）
- [x]GrowthRateRule のテストを作成

### 4.3 PercentageRule

- [x]PercentageRule を実装（→ MultiplyNode(baseRef, ratio)）
- [x]PercentageRule のテストを作成

### 4.4 ReferenceRule

- [x]ReferenceRule を実装（→ ReferenceNode(ref)、期間オフセット対応）
- [x]ReferenceRule のテストを作成

### 4.5 BalanceChangeRule

- [x]BalanceChangeRule を実装（→ AddNode(prevBalanceRef, changeRef)）
- [x]BalanceChangeRule のテストを作成

### 4.6 SumRule

- [x]SumRule を実装（→ AddNode(childRefs)、AccountHierarchy から子科目取得）
- [x]SumRule のテストを作成

### 4.7 SubtractRule

- [x]SubtractRule を実装（→ SubtractNode(minuendRef, subtrahendRef)）
- [x]SubtractRule のテストを作成

### 4.8 エクスポート

- [x]rule パッケージの index.ts でエクスポート

---

## Step 5: AstEngine 統合

### 5.1 AstEngine 実装

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/AstEngine.ts` | NodeRegistry, DependencyGraph, EvaluationCache, Rule | 計算実行エンジン |
| 2 | `computation/AstEngine.test.ts` | — | 統合テスト |

タスク:
- [x]AstEngine.create() を実装
- [x]RuleBuildContext の内部実装を作成
- [x]registerRules() を実装（実績値 → ConstantNode、予測期間 → Rule.buildFormulaNode）
- [x]compute() を実装（cache.clear → トポロジカルソート → 順次評価 → ComputationResult）
- [x]getValue() を実装
- [x]ComputationResult / ComputationError インターフェースを定義

### 5.2 AstEngine テスト

- [x]統合テスト: 簡易モデル（5 科目 × 実績 1 期 + 予測 1 期）で計算結果を検証
- [x]実績値が compute() 後も変更されないことのテスト
- [x]予測期間のみにルールが適用されることのテスト
- [x]循環依存ケースで ComputationResult.errors にエラーが含まれることのテスト

### 5.3 エクスポート

- [x]computation パッケージの index.ts でエクスポート
- [x]`packages/domain/src/index.ts` に computation と rule のエクスポートを追加

---

## Step 6: Phase 2 検証

- [x]全テスト実行（`vitest run`）して全パス
- [x]ESLint エラーなし
- [x]TypeScript strict モードでエラーなし
- [x]パッケージ間の依存方向が正しいこと

---

*— End of Document —*
