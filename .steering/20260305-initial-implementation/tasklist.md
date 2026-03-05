# 初回実装 — タスクリスト

**対象:** SimpleFAM MVP 全機能の初回実装
**日付:** 2026-03-05

---

## 凡例

- [ ] 未着手
- [x] 完了

---

## Phase 1: ドメインモデル基盤

### 1.1 プロジェクト初期設定

- [x] monorepo 構成のセットアップ（package.json, tsconfig）
- [x] `packages/domain/` ディレクトリ作成
- [x] テストフレームワーク（Vitest）の導入
- [x] ESLint + Prettier の設定
- [x] パッケージ参照方向の ESLint ルール設定

### 1.2 account パッケージ

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `account/AccountCode.ts` | なし | 科目コードの値オブジェクト |
| 2 | `account/AccountCode.test.ts` | — | of(), equals(), 空文字エラー |
| 3 | `account/AccountName.ts` | なし | 科目名の値オブジェクト |
| 4 | `account/AccountType.ts` | なし | PL / BS / CF の型定義 |
| 5 | `account/Account.ts` | 1, 3, 4 | 勘定科目エンティティ |
| 6 | `account/Account.test.ts` | — | create(), isRoot(), belongsTo() |
| 7 | `account/AccountHierarchy.ts` | 1, 5 | 科目の木構造管理 |
| 8 | `account/AccountHierarchy.test.ts` | — | build(), 循環検出, getChildren(), getLeaves() |
| 9 | `account/index.ts` | — | パッケージのエクスポート |

タスク:
- [x] AccountCode を実装（private constructor, static of, equals, Object.freeze）
- [x] AccountCode のテストを作成
- [x] AccountName を実装
- [x] AccountType を定義
- [x] Account エンティティを実装（create, isRoot, belongsTo）
- [x] Account のテストを作成
- [x] AccountHierarchy を実装（build, detectCycle, getChildren, getLeaves, getByType, getDepth, toSorted）
- [x] AccountHierarchy のテストを作成（正常系 + 循環参照検出）
- [x] account パッケージの index.ts でエクスポート

### 1.3 money パッケージ

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `money/Money.ts` | なし | 金額の値オブジェクト |
| 2 | `money/Money.test.ts` | — | 四則演算, 不変性, toDisplay |
| 3 | `money/GrowthRate.ts` | 1 | 成長率 |
| 4 | `money/GrowthRate.test.ts` | — | apply() |
| 5 | `money/Ratio.ts` | 1 | 割合 |
| 6 | `money/Ratio.test.ts` | — | apply() |
| 7 | `money/index.ts` | — | エクスポート |

タスク:
- [x] Money を実装（of, zero, add, subtract, multiply, negate, toDisplay）
- [x] Money のテストを作成
- [x] GrowthRate を実装（of, apply, toPercentString）
- [x] GrowthRate のテストを作成
- [x] Ratio を実装（of, apply, toPercentString）
- [x] Ratio のテストを作成
- [x] money パッケージの index.ts でエクスポート

### 1.4 period パッケージ

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `period/Period.ts` | なし | 会計期間の値オブジェクト |
| 2 | `period/Period.test.ts` | — | of, next, prev, toLabel, compareTo |
| 3 | `period/FiscalYearSetting.ts` | 1 | 決算期設定 |
| 4 | `period/FiscalYearSetting.test.ts` | — | getStartMonth, isActual/isForecast |
| 5 | `period/Periods.ts` | 1, 3 | 期間コレクション |
| 6 | `period/Periods.test.ts` | — | generate, getActuals, getForecasts |
| 7 | `period/index.ts` | — | エクスポート |

タスク:
- [x] Period を実装（of, next, prev, equals, toLabel, compareTo）
- [x] Period のテストを作成
- [x] FiscalYearSetting を実装（of, getStartMonth, isActualPeriod, isForecastPeriod）
- [x] FiscalYearSetting のテストを作成
- [x] Periods を実装（generate, getAll, getActuals, getForecasts, getLabels）
- [x] Periods のテストを作成
- [x] period パッケージの index.ts でエクスポート

### 1.5 Phase 1 検証

- [x] 全テスト実行（`vitest run`）して全パス
- [x] パッケージ間の依存方向が正しいこと（ESLint で確認）

---

## Phase 2: 計算エンジン

### 2.1 computation パッケージ（FormulaNode 基盤）

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `computation/FormulaNode.ts` | account, period, money | ノードインターフェース + 6 種の具体ノード |
| 2 | `computation/FormulaNode.test.ts` | — | 各ノードの evaluate() |
| 3 | `computation/EvaluationCache.ts` | なし | 計算結果キャッシュ |
| 4 | `computation/NodeRegistry.ts` | 1 | ノード管理 + ID 生成 |
| 5 | `computation/DependencyGraph.ts` | 4 | トポロジカルソート + 循環検出 |
| 6 | `computation/DependencyGraph.test.ts` | — | ソート順, 循環エラー |
| 7 | `computation/AstEngine.ts` | 1-5 + rule | 計算実行エンジン |
| 8 | `computation/AstEngine.test.ts` | — | 統合的な計算テスト |
| 9 | `computation/index.ts` | — | エクスポート |

タスク:
- [ ] FormulaNode インターフェース + FormulaNodeRef を定義
- [ ] ConstantNode, AddNode, SubtractNode, MultiplyNode, ReferenceNode, NegateNode を実装
- [ ] FormulaNode のテストを作成（各ノードの evaluate）
- [ ] EvaluationCache を実装
- [ ] NodeRegistry を実装（register, getOrCreate, buildNodeId）
- [ ] DependencyGraph を実装（build, topologicalSort, detectCycle）
- [ ] DependencyGraph のテストを作成（正常ソート + 循環検出）

### 2.2 rule パッケージ

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `rule/Rule.ts` | account, period, computation | Rule インターフェース + RuleType 型 |
| 2 | `rule/RuleBuildContext.ts` | account, period, computation | ルール構築時のコンテキスト |
| 3 | `rule/ManualInputRule.ts` | 1, 2 | 手入力ルール → ConstantNode |
| 4 | `rule/GrowthRateRule.ts` | 1, 2 | 成長率ルール → MultiplyNode |
| 5 | `rule/PercentageRule.ts` | 1, 2 | 割合ルール → MultiplyNode |
| 6 | `rule/ReferenceRule.ts` | 1, 2 | 参照ルール → ReferenceNode |
| 7 | `rule/BalanceChangeRule.ts` | 1, 2 | 残高変動ルール → AddNode |
| 8 | `rule/SumRule.ts` | 1, 2 | 合計ルール → AddNode(children) |
| 9 | `rule/SubtractRule.ts` | 1, 2 | 差引ルール → SubtractNode |
| 10 | 各ルールのテストファイル | — | buildFormulaNode() の検証 |
| 11 | `rule/index.ts` | — | エクスポート |

タスク:
- [ ] Rule インターフェース + RuleType を定義
- [ ] RuleBuildContext インターフェースを定義
- [ ] ManualInputRule を実装 + テスト
- [ ] GrowthRateRule を実装 + テスト
- [ ] PercentageRule を実装 + テスト
- [ ] ReferenceRule を実装 + テスト
- [ ] BalanceChangeRule を実装 + テスト
- [ ] SumRule を実装 + テスト
- [ ] SubtractRule を実装 + テスト
- [ ] rule パッケージの index.ts でエクスポート

### 2.3 AstEngine 統合

- [ ] AstEngine を実装（registerRules, compute, getValue）
- [ ] AstEngine のテストを作成（簡易モデル 3〜5 科目 × 2 期間で検証）
- [ ] computation パッケージの index.ts でエクスポート

### 2.4 Phase 2 検証

- [ ] 全テスト実行して全パス
- [ ] パッケージ間の依存方向が正しいこと

---

## Phase 3: 財務諸表 + CF 自動生成

### 3.1 statement パッケージ

**作成ファイルと順序:**

| # | ファイル | 依存先 | 概要 |
|---|---------|--------|------|
| 1 | `statement/StatementLine.ts` | account, period, money | 財務諸表の 1 行 |
| 2 | `statement/FinancialStatement.ts` | 1 + computation | PL・BS の構造化 |
| 3 | `statement/FinancialStatement.test.ts` | — | buildPl, buildBs, 行の順序とインデント |
| 4 | `statement/CashFlowStatement.ts` | 2 | 間接法 CF の自動生成 |
| 5 | `statement/CashFlowStatement.test.ts` | — | 営業/投資/財務 CF, 現預金計算 |
| 6 | `statement/BalanceValidator.ts` | 2 | 貸借一致検証 |
| 7 | `statement/BalanceValidator.test.ts` | — | 一致ケース, 不一致ケース |
| 8 | `statement/index.ts` | — | エクスポート |

タスク:
- [ ] StatementLine インターフェースを定義
- [ ] FinancialStatement を実装（buildPl, buildBs, getLine, getValue）
- [ ] FinancialStatement のテストを作成
- [ ] CashFlowStatement を実装（generate, 営業/投資/財務 CF, 現預金）
- [ ] CashFlowStatement のテストを作成
- [ ] BalanceValidator を実装（validate）
- [ ] BalanceValidator のテストを作成
- [ ] statement パッケージの index.ts でエクスポート

### 3.2 統合テスト

- [ ] テスト用シードデータの作成（実績 2 期 + 予測 3 期、手計算で検証可能な値）
- [ ] 統合テスト: シードデータ → AstEngine → PL → BS → CF → 現預金 → 貸借一致
- [ ] 全テスト実行して全パス

---

## Phase 4: サーバー + フロントエンド

### 4.1 Prisma + DB セットアップ

タスク:
- [ ] `packages/server/` ディレクトリ作成
- [ ] Prisma の導入（`prisma init --datasource-provider sqlite`）
- [ ] schema.prisma 定義（5 テーブル: financial_models, accounts, actual_values, forecast_rules, computed_values）
- [ ] マイグレーション実行

### 4.2 Repository 層

タスク:
- [ ] ModelRepository を実装（save, findById, ドメイン ⇔ DB 変換）

### 4.3 Hono API サーバー

タスク:
- [ ] Hono アプリケーションのセットアップ
- [ ] `POST /api/models` ルート（シードデータ投入 → バリデーション → 計算 → 保存）
- [ ] `GET /api/models/:id` ルート
- [ ] `GET /api/models/:id/statements/pl` ルート
- [ ] `GET /api/models/:id/statements/bs` ルート
- [ ] `GET /api/models/:id/statements/cf` ルート
- [ ] `GET /api/models/:id/validate` ルート
- [ ] エラーハンドリングミドルウェア

### 4.4 React フロントエンド

タスク:
- [ ] `packages/web/` ディレクトリ作成 + Vite セットアップ
- [ ] react-data-grid の導入
- [ ] PlGridAdapter を実装（FinancialStatement → rows/columns 変換）
- [ ] BsGridAdapter を実装
- [ ] CfGridAdapter を実装
- [ ] `useStatementData` フックを実装（API からデータ取得）
- [ ] StatementGrid コンポーネントを実装
- [ ] StatementTabs コンポーネントを実装（PL / BS / CF タブ切替）
- [ ] App.tsx を実装
- [ ] 実績列（白背景）と予測列（グレー背景）のスタイリング

### 4.5 Phase 4 検証

- [ ] API エンドポイントの動作確認
- [ ] UI でシードデータ投入 → PL / BS / CF 表示の確認
- [ ] 実績/予測の背景色区別の確認

---

## 最終チェック

- [ ] 全テスト実行して全パス
- [ ] ESLint エラーなし
- [ ] TypeScript strict モードでエラーなし
- [ ] 貸借一致が全期間で成立

---

*— End of Document —*
