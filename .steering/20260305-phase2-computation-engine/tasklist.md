# Phase 2: 計算エンジン — タスクリスト

**対象:** computation パッケージ + rule パッケージの実装
**日付:** 2026-03-05

---

## 凡例

- [ ] 未着手
- [x] 完了

---

## Step 1: FormulaNode 基盤 + EvaluationCache

### 1.1 EvaluationCache

- [ ] `computation/EvaluationCache.ts` を作成（get, set, has, clear）

### 1.2 FormulaNode 階層

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/FormulaNode.ts` | EvaluationCache, account, period, money | インターフェース + FormulaNodeRef + 6 種の具体ノード |
| 2 | `computation/FormulaNode.test.ts` | — | 各ノードの evaluate() テスト |

タスク:
- [ ] FormulaNode インターフェースを定義（nodeId, evaluate, getDependencies）
- [ ] FormulaNodeRef インターフェース + FormulaNodeRefImpl を実装
- [ ] ConstantNode を実装
- [ ] AddNode を実装
- [ ] SubtractNode を実装
- [ ] MultiplyNode を実装
- [ ] ReferenceNode を実装
- [ ] NegateNode を実装
- [ ] 全ノードの evaluate() テストを作成（正常系 + キャッシュヒット）

---

## Step 2: NodeRegistry + DependencyGraph

### 2.1 NodeRegistry

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/NodeRegistry.ts` | FormulaNode, account, period | ノード管理 + ID 生成 |

タスク:
- [ ] NodeRegistry を実装（register, get, getOrCreate, getAll, has）
- [ ] `buildNodeId()` を実装（`{accountCode}:{fiscalYear}-{month}`）

### 2.2 DependencyGraph

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/DependencyGraph.ts` | NodeRegistry, FormulaNode | トポロジカルソート + 循環検出 |
| 2 | `computation/DependencyGraph.test.ts` | — | ソート順・循環エラーのテスト |

タスク:
- [ ] DependencyGraph.build() を実装（隣接リスト + 入次数マップの構築）
- [ ] topologicalSort() を実装（Kahn のアルゴリズム）
- [ ] detectCycle() を実装（未処理ノードから関与する AccountCode を抽出）
- [ ] テストを作成（正常ソート + 循環検出 + 独立ノード）

---

## Step 3: Rule インターフェース

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `rule/Rule.ts` | account, computation/FormulaNode | Rule インターフェース + RuleType |
| 2 | `rule/RuleBuildContext.ts` | account, period, computation/FormulaNode | ルール構築コンテキスト |

タスク:
- [ ] Rule インターフェースを定義（accountCode, ruleType, buildFormulaNode）
- [ ] RuleType を定義（7 種の union 型）
- [ ] RuleBuildContext インターフェースを定義（getNodeRef, getHierarchy）

---

## Step 4: Rule 実装（7 種類）

各ルールの実装とテストを行う。

### 4.1 ManualInputRule

- [ ] ManualInputRule を実装（→ ConstantNode）
- [ ] ManualInputRule のテストを作成

### 4.2 GrowthRateRule

- [ ] GrowthRateRule を実装（→ MultiplyNode(prevRef, 1 + rate)）
- [ ] GrowthRateRule のテストを作成

### 4.3 PercentageRule

- [ ] PercentageRule を実装（→ MultiplyNode(baseRef, ratio)）
- [ ] PercentageRule のテストを作成

### 4.4 ReferenceRule

- [ ] ReferenceRule を実装（→ ReferenceNode(ref)、期間オフセット対応）
- [ ] ReferenceRule のテストを作成

### 4.5 BalanceChangeRule

- [ ] BalanceChangeRule を実装（→ AddNode(prevBalanceRef, changeRef)）
- [ ] BalanceChangeRule のテストを作成

### 4.6 SumRule

- [ ] SumRule を実装（→ AddNode(childRefs)、AccountHierarchy から子科目取得）
- [ ] SumRule のテストを作成

### 4.7 SubtractRule

- [ ] SubtractRule を実装（→ SubtractNode(minuendRef, subtrahendRef)）
- [ ] SubtractRule のテストを作成

### 4.8 エクスポート

- [ ] rule パッケージの index.ts でエクスポート

---

## Step 5: AstEngine 統合

### 5.1 AstEngine 実装

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/AstEngine.ts` | NodeRegistry, DependencyGraph, EvaluationCache, Rule | 計算実行エンジン |
| 2 | `computation/AstEngine.test.ts` | — | 統合テスト |

タスク:
- [ ] AstEngine.create() を実装
- [ ] RuleBuildContext の内部実装を作成
- [ ] registerRules() を実装（実績値 → ConstantNode、予測期間 → Rule.buildFormulaNode）
- [ ] compute() を実装（cache.clear → トポロジカルソート → 順次評価 → ComputationResult）
- [ ] getValue() を実装
- [ ] ComputationResult / ComputationError インターフェースを定義

### 5.2 AstEngine テスト

- [ ] 統合テスト: 簡易モデル（5 科目 × 実績 1 期 + 予測 1 期）で計算結果を検証
- [ ] 実績値が compute() 後も変更されないことのテスト
- [ ] 予測期間のみにルールが適用されることのテスト
- [ ] 循環依存ケースで ComputationResult.errors にエラーが含まれることのテスト

### 5.3 エクスポート

- [ ] computation パッケージの index.ts でエクスポート
- [ ] `packages/domain/src/index.ts` に computation と rule のエクスポートを追加

---

## Step 6: Phase 2 検証

- [ ] 全テスト実行（`vitest run`）して全パス
- [ ] ESLint エラーなし
- [ ] TypeScript strict モードでエラーなし
- [ ] パッケージ間の依存方向が正しいこと

---

*— End of Document —*
