# 初回実装 — 設計

**対象:** SimpleFAM MVP 全機能の初回実装
**日付:** 2026-03-05

---

## 1. 実装アプローチ

### 1.1 基本方針

パッケージ依存方向の上流から下流へ順に実装する。各フェーズ完了時に単体テストで正確性を確認してから次へ進む。

```
Phase 1: account, period, money（依存なしの基盤）
Phase 2: rule, computation（計算エンジン）
Phase 3: statement（財務諸表 + CF + 検証）
Phase 4: server, web（API + UI）
```

### 1.2 フェーズ間の検証ポイント

| フェーズ完了時 | 検証内容 |
|----------------|----------|
| Phase 1 完了 | 値オブジェクトの不変性、AccountHierarchy の循環検出、Period の生成・比較 |
| Phase 2 完了 | 全 7 ルールの FormulaNode 構築、トポロジカルソート、計算結果の正確性 |
| Phase 3 完了 | PL・BS の構造化、CF 自動生成、現預金計算、貸借一致（統合テスト） |
| Phase 4 完了 | API エンドツーエンド、UI 表示 |

## 2. Phase 1: ドメインモデル基盤

### 2.1 実装するファイルと順序

依存関係がないパッケージから着手する。money は他に依存しないため account と並行可能。

```
packages/domain/
├── account/
│   ├── AccountCode.ts          ← 最初に作成（他の全てが参照）
│   ├── AccountName.ts
│   ├── AccountType.ts
│   ├── Account.ts              ← AccountCode, AccountName, AccountType を使用
│   └── AccountHierarchy.ts     ← Account を使用
├── period/
│   ├── Period.ts
│   ├── FiscalYearSetting.ts
│   └── Periods.ts              ← Period, FiscalYearSetting を使用
└── money/
    ├── Money.ts
    ├── GrowthRate.ts           ← Money を使用
    └── Ratio.ts                ← Money を使用
```

### 2.2 ファイルごとの設計ポイント

**AccountCode.ts**
- private constructor + static `of()` ファクトリ
- 空文字・空白のみはエラー
- `equals()` で値の同一性比較
- `Object.freeze(this)` で不変性保証

**AccountHierarchy.ts**
- `static build()` で Account 配列から構築
- 内部に `ReadonlyMap<string, Account>` と `ReadonlyMap<string, AccountCode[]>` を保持
- `detectCycle()` は DFS でバックエッジを検出

**Period.ts**
- `fiscalYear` と `month` のペアで一意
- `next()` / `prev()` で月の繰り越し（12→1、1→12）を正しく処理
- `toLabel()` で `"FY2024/4"` 形式の文字列を生成

**Periods.ts**
- `FiscalYearSetting` から全期間を自動生成
- 実績期間と予測期間の区分を管理

**Money.ts**
- 四則演算メソッドは全て新しいインスタンスを返す（不変）
- `toDisplay()` で千円・百万円単位のフォーマット

### 2.3 テスト方針

各値オブジェクト・コレクションオブジェクトに対して以下を検証：
- ファクトリメソッドのバリデーション（正常系・異常系）
- `equals()` の値比較
- 不変性（プロパティ変更不可）
- コレクションの業務メソッド（getChildren, getLeaves 等）

## 3. Phase 2: 計算エンジン

### 3.1 実装するファイルと順序

rule パッケージと computation パッケージは密接に関連するため、FormulaNode を先に定義してからルールを実装する。

```
packages/domain/
├── computation/
│   ├── FormulaNode.ts          ← インターフェース + 具体ノード（6種）
│   ├── EvaluationCache.ts
│   ├── NodeRegistry.ts         ← FormulaNode を使用
│   ├── DependencyGraph.ts      ← NodeRegistry を使用
│   └── AstEngine.ts            ← 全てを統合
└── rule/
    ├── Rule.ts                 ← インターフェース定義
    ├── RuleBuildContext.ts
    ├── ManualInputRule.ts
    ├── GrowthRateRule.ts
    ├── PercentageRule.ts
    ├── ReferenceRule.ts
    ├── BalanceChangeRule.ts
    ├── SumRule.ts
    └── SubtractRule.ts
```

### 3.2 設計ポイント

**FormulaNode.ts**
- `FormulaNode` インターフェース + `FormulaNodeRef` インターフェース
- 6 つの具体ノード: ConstantNode, AddNode, SubtractNode, MultiplyNode, ReferenceNode, NegateNode
- 各ノードの `evaluate()` は `EvaluationCache` を参照してメモ化

**DependencyGraph.ts**
- Kahn のアルゴリズム（入次数ベース）でトポロジカルソート
- 循環検出時は関与する AccountCode の配列を返す

**AstEngine.ts**
- `registerRules()` で全ルール × 全期間の FormulaNode を構築
- 実績値は ConstantNode として登録
- `compute()` でトポロジカルソート順に全ノードを評価

**各 Rule 実装**
- `buildFormulaNode()` が適切なノードを返すことを単体テストで検証
- GrowthRateRule: `MultiplyNode(prevPeriodRef, 1 + rate)`
- PercentageRule: `MultiplyNode(referenceAccountRef, ratio)`
- SumRule: `AddNode(child1Ref, child2Ref, ...)`（AccountHierarchy から子科目を取得）

### 3.3 テスト方針

- 各ルールの `buildFormulaNode()` が正しいノードツリーを返すこと
- AstEngine で簡易モデル（3〜5 科目 × 2 期間）を計算し結果を検証
- 循環依存ケースでエラーが返ること
- 計算順序が依存関係に従うこと

## 4. Phase 3: 財務諸表 + CF

### 4.1 実装するファイルと順序

```
packages/domain/
└── statement/
    ├── StatementLine.ts
    ├── FinancialStatement.ts   ← PL・BS の構造化
    ├── CashFlowStatement.ts    ← CF 自動生成（PL + BS → CF）
    └── BalanceValidator.ts     ← 貸借一致検証
```

### 4.2 設計ポイント

**FinancialStatement.ts**
- `buildPl()` / `buildBs()` で AccountHierarchy のツリー走査→ StatementLine 生成
- 各行の `level`（インデント深さ）は `AccountHierarchy.getDepth()` から取得

**CashFlowStatement.ts**
- `generate()` の入力: PL（FinancialStatement）+ BS（FinancialStatement）+ Periods
- 営業 CF: 税引前利益 + 減価償却 + 運転資本増減 - 法人税
- 投資 CF: 固定資産の増減
- 財務 CF: 借入金の増減
- 現預金: 期首 + 営業CF + 投資CF + 財務CF

**現預金計算フロー**
1. 現預金を除く PL・BS 全科目を AstEngine で計算
2. CashFlowStatement.generate() で CF を生成
3. CF の期末現預金を BS の現預金科目に反映
4. BalanceValidator.validate() で貸借一致を検証

### 4.3 テスト方針

- 統合テスト: シードデータ投入 → PL → BS → CF → 現預金 → 貸借一致
- 手計算で検証可能なサンプルデータ（実績 2 期 + 予測 3 期）を用意
- 貸借不一致ケースのエラーメッセージ検証

## 5. Phase 4: サーバー + UI

### 5.1 実装するファイルと順序

```
packages/
├── server/
│   ├── prisma/
│   │   └── schema.prisma       ← DB スキーマ定義
│   ├── repository/
│   │   └── ModelRepository.ts  ← ドメイン ⇔ DB 変換
│   ├── routes/
│   │   ├── models.ts           ← POST /api/models, GET /api/models/:id
│   │   └── statements.ts       ← GET /api/models/:id/statements/pl|bs|cf
│   └── index.ts                ← Hono アプリケーション起動
└── web/
    ├── src/
    │   ├── components/
    │   │   ├── StatementGrid.tsx    ← react-data-grid ラッパー
    │   │   └── StatementTabs.tsx    ← PL / BS / CF タブ切替
    │   ├── adapters/
    │   │   ├── PlGridAdapter.ts
    │   │   ├── BsGridAdapter.ts
    │   │   └── CfGridAdapter.ts
    │   ├── hooks/
    │   │   └── useStatementData.ts  ← API からデータ取得
    │   └── App.tsx
    └── vite.config.ts
```

### 5.2 設計ポイント

**Prisma スキーマ**
- functional-design.md セクション 2.1 の ER 図に準拠
- 5 テーブル: financial_models, accounts, actual_values, forecast_rules, computed_values

**Repository**
- DB レコード → ドメインオブジェクトの変換を担当
- ドメイン層は Prisma に依存しない

**API ルート**
- `POST /api/models`: シードデータ受付 → バリデーション → 計算 → 保存
- `GET /api/models/:id/statements/:type`: 計算結果を GridAdapter 形式で返却

**React UI**
- GridAdapter がドメインオブジェクト → react-data-grid の rows/columns に変換
- 実績列は白背景、予測列は薄グレー背景
- 科目の階層はインデントで表現

## 6. 影響範囲

初回実装のため、既存コードへの影響はない。新規作成のみ。

---

*— End of Document —*
