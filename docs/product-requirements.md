# SimpleFAM MVP 要件定義書

**Simple Financial Analysis Model**
ドメイン駆動設計に基づく財務モデルアプリケーション

Version 1.0 — 2026年3月

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [ドメインモデル設計](#2-ドメインモデル設計)
3. [機能要件](#3-機能要件)
4. [非機能要件](#4-非機能要件)
5. [API設計](#5-api設計)
6. [テスト戦略](#6-テスト戦略)
7. [開発計画](#7-開発計画)
8. [用語集](#8-用語集)

---

## 1. プロジェクト概要

### 1.1 プロジェクト名

SimpleFAM (Simple Financial Analysis Model) MVP

### 1.2 目的

ドメイン駆動設計（DDD）の原則に基づき、日本の会計基準に対応した財務モデルアプリケーションのMVP（Minimum Viable Product）を構築する。実績値の投入から将来予測、キャッシュフロー計算書の自動生成までを一貫して行える計算エンジンを実現する。

### 1.3 スコープ

#### 1.3.1 MVPに含む機能

1. JSONシードデータによる実績値投入（簡易PL・簡易BSの作成）
2. 計算ルール（成長率・割合等）による将来値算出
3. キャッシュフロー計算書（間接法）の自動生成と現預金計算
4. 貸借一致検証（BSの資産合計 = 負債・純資産合計）
5. Web UIによる財務諸表の表示

#### 1.3.2 MVPに含めない機能

- イベント実行機能（LBO・M&A等）
- CSV/Excelインポート機能
- ユーザー認証・権限管理
- 複数モデルの管理
- データのエクスポート

### 1.4 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| フロントエンド | React / TypeScript (Vite) | react-data-gridを使用 |
| バックエンド | Hono (TypeScript) | REST API |
| データベース | SQLite | Prisma ORM経由 |
| ORM | Prisma | 型安全なDBアクセス |
| ドメイン層 | TypeScript | DDDに基づく設計 |

---

## 2. ドメインモデル設計

### 2.1 ドメインの境界づけコンテキスト

MVPのドメインは以下の5つの境界づけコンテキストから構成される。

| コンテキスト | 責務 | 主要ドメインオブジェクト |
|---|---|---|
| 勘定科目 (account) | 科目の定義と階層構造 | Account, AccountHierarchy, AccountCode |
| 会計期間 (period) | 期間の定義と管理 | Period, Periods, FiscalYearSetting |
| 計算ルール (rule) | 予測計算の定義 | Rule, GrowthRateRule, PercentageRule |
| 計算エンジン (computation) | ASTによる計算実行 | FormulaNode, DependencyGraph, AstEngine |
| 財務諸表 (statement) | PL/BS/CFの構造と値 | FinancialStatement, CashFlowStatement |

### 2.2 パッケージ参照方向

各パッケージの依存方向は厳密に制御する。矢印は「参照する側 → 参照される側」を示す。

```
account ← period ← rule ← computation ← statement
```

**禁止例:** accountがruleやcomputationを参照すること。periodがstatementを参照すること。上流のパッケージは下流の存在を知らない。

### 2.3 値オブジェクト一覧

以下のオブジェクトはすべて不変（immutable）として設計する。生成後の状態変更は禁止し、変更が必要な場合は新しいインスタンスを生成する。

| 値オブジェクト | パッケージ | 説明 |
|---|---|---|
| AccountCode | account | 勘定科目コード。科目を一意に識別する文字列 |
| AccountName | account | 科目名。日本語名を保持 |
| AccountType | account | PL / BS / CF の区分 |
| Period | period | 会計期間。fiscalYearとmonthで特定 |
| FiscalYearSetting | period | 決算期設定（3月決算等） |
| Money | money | 金額。単位付きの数値 |
| GrowthRate | money | 成長率。比率値とその計算ロジック |
| Ratio | money | 割合。百分率とその計算ロジック |

### 2.4 コレクションオブジェクト一覧

配列やMapを直接操作せず、専用クラスで包み、業務ロジックをメソッドとして提供する。

| コレクション | パッケージ | 主要メソッド例 |
|---|---|---|
| AccountHierarchy | account | getChildren(), getLeaves(), getByCode(), getByType() |
| Periods | period | generate(), toQuarterly(), getLabels(), contains() |
| NodeRegistry | computation | getOrCreate(), topologicalSort(), detectCycle() |

---

## 3. 機能要件

### 3.1 FR-001: シードデータ投入

#### 概要

JSON形式のシードデータを投入し、勘定科目の階層構造と実績値をシステムに登録する。これにより簡易損益計算書（PL）および簡易貸借対照表（BS）が構成される。

#### シードデータのJSON構造

シードデータは以下の3つのセクションから構成される。

- **fiscalYearSetting:** 決算期の設定（決算月、実績期間数、予測期間数）
- **accounts:** 勘定科目の定義（科目コード、名前、タイプ、親子関係、表示順序）
- **actuals:** 実績値データ（科目コード × 期間 → 金額）

#### PL科目構成（簡易）

| 科目コード | 科目名 | タイプ | 算出方法 |
|---|---|---|---|
| revenue | 売上高 | PL | 子科目の合計 or 葉科目 |
| cogs | 売上原価 | PL | 子科目の合計 or 葉科目 |
| gross_profit | 売上総利益 | PL | 売上高 - 売上原価 |
| sga | 販管費 | PL | 子科目の合計 or 葉科目 |
| operating_income | 営業利益 | PL | 売上総利益 - 販管費 |
| non_operating | 営業外損益 | PL | 子科目の合計 |
| ordinary_income | 経常利益 | PL | 営業利益 + 営業外損益 |
| extraordinary | 特別損益 | PL | 子科目の合計 |
| pbt | 税引前利益 | PL | 経常利益 + 特別損益 |
| tax | 法人税等 | PL | 税引前利益 × 実効税率 |
| net_income | 当期純利益 | PL | 税引前利益 - 法人税等 |

#### BS科目構成（簡易）

| 科目コード | 科目名 | タイプ | 区分 |
|---|---|---|---|
| cash | 現預金 | BS | 流動資産 |
| accounts_receivable | 売掛金 | BS | 流動資産 |
| inventory | 棚卸資産 | BS | 流動資産 |
| current_assets | 流動資産合計 | BS | 流動資産 |
| ppe_net | 有形固定資産（純額） | BS | 固定資産 |
| fixed_assets | 固定資産合計 | BS | 固定資産 |
| total_assets | 資産合計 | BS | 資産 |
| accounts_payable | 買掛金 | BS | 流動負債 |
| current_liabilities | 流動負債合計 | BS | 流動負債 |
| long_term_debt | 長期借入金 | BS | 固定負債 |
| fixed_liabilities | 固定負債合計 | BS | 固定負債 |
| total_liabilities | 負債合計 | BS | 負債 |
| capital | 資本金 | BS | 純資産 |
| retained_earnings | 利益剰余金 | BS | 純資産 |
| total_equity | 純資産合計 | BS | 純資産 |
| total_le | 負債・純資産合計 | BS | 負債・純資産 |

#### 受入条件

1. JSONのバリデーションが成功すること
2. 勘定科目の親子関係に循環参照がないこと
3. 実績値の科目コードが科目定義に存在すること
4. 実績値は葉科目（子を持たない科目）にのみ指定されること

### 3.2 FR-002: 計算ルールによる将来値算出

#### 概要

実績期間の値を基に、計算ルールを適用して予測期間の値を自動算出する。各ルールはドメインオブジェクトとして実装し、自らFormulaNodeを構築する責務を持つ（原則③：メソッドをロジックの置き場所にする）。

#### MVPで実装するルール一覧

| ルール名 | クラス名 | 計算内容 | 使用例 |
|---|---|---|---|
| 手入力 | ManualInputRule | 指定された固定値をそのまま使用 | 資本金、特別損益 |
| 成長率 | GrowthRateRule | 前期値 × (1 + 成長率) | 売上高の年率成長 |
| 割合 | PercentageRule | 参照科目の値 × 割合 | 売上原価(売上の70%) |
| 参照 | ReferenceRule | 他科目の値をそのままコピー | 前期末残高の参照 |
| 残高変動 | BalanceChangeRule | 前期末BS残高 + 当期増減 | BS科目の残高計算 |
| 合計 | SumRule | 子科目の合計値 | 売上総利益、資産合計 |
| 差引 | SubtractRule | 科目A - 科目B | 営業利益 = 総利益 - SGA |

#### ルール適用の仕組み

1. 各ルールは Rule インターフェースを実装する
2. 各ルールが `buildFormulaNode()` メソッドを持ち、自らASTノードを構築する
3. AstEngine がノード間の依存関係をトポロジカルソートし、順序を決定する
4. 依存関係に循環がある場合はエラーとする
5. 計算結果はEvaluationCacheに保存し、同一期間の再計算を避ける

#### ルールの指定方法

ルールはシードデータのJSON内で各科目に対して指定する。以下に例を示す。

```json
{ "accountCode": "revenue", "ruleType": "GROWTH_RATE", "params": { "rate": 0.05 } }
{ "accountCode": "cogs", "ruleType": "PERCENTAGE", "params": { "referenceAccount": "revenue", "ratio": 0.70 } }
{ "accountCode": "capital", "ruleType": "MANUAL_INPUT", "params": { "value": 100000000 } }
```

### 3.3 FR-003: キャッシュフロー計算書の自動生成

#### 概要

損益計算書（PL）と貸借対照表（BS）のデータから、間接法によるキャッシュフロー計算書（CF）を自動生成する。算出されたフリーキャッシュフローにより、BS上の現預金残高を算出する。

#### CF科目構成（間接法）

| 区分 | 科目 | 算出ロジック |
|---|---|---|
| 営業CF | 税引前利益 | PLより取得 |
| 営業CF | 減価償却費（加算） | 非資金項目の加算 |
| 営業CF | 売掛金の増減 | −(当期BS - 前期BS) |
| 営業CF | 棚卸資産の増減 | −(当期BS - 前期BS) |
| 営業CF | 買掛金の増減 | 当期BS - 前期BS |
| 営業CF | 法人税等の支払 | PLの税額をマイナス |
| 営業CF | 営業CF合計 | 上記の合計 |
| 投資CF | 設備投資 | 固定資産の増加分 |
| 投資CF | 投資CF合計 | 上記の合計 |
| 財務CF | 借入金の増減 | 当期BS - 前期BS |
| 財務CF | 財務CF合計 | 上記の合計 |
| 合計 | 現預金の増減 | 営業CF + 投資CF + 財務CF |
| 合計 | 期首現預金 | 前期末BSの現預金 |
| 合計 | 期末現預金 | 期首 + 増減 |

#### 現預金計算のフロー

1. PLとBSの全科目を計算（**現預金を除く**）
2. CFを自動生成し、現預金の増減を算出
3. 前期末現預金 + 増減 = 当期末現預金としてBSに反映
4. 貸借一致を検証

**重要:** 現預金はBS科目でありながら、その値はCFから決定される。この循環的な依存関係をASTエンジンで適切に解決する必要がある。具体的には、現預金を除く全科目を先に計算し、CFを生成した後に現預金を確定させる計算順序を保証する。

### 3.4 FR-004: 貸借一致検証

#### 概要

全期間において、貸借対照表の資産合計と負債・純資産合計が一致することを自動的に検証する。

#### 検証条件

全ての期間 t について:

**資産合計(t) = 負債合計(t) + 純資産合計(t)**

#### 検証タイミング

- シードデータ投入時（実績値）
- 予測計算完了時
- 任意のルール変更後の再計算時

#### エラーハンドリング

貸借不一致が検出された場合は、不一致が発生した期間と差額をエラーメッセージとして返却する。UI上でも貸借不一致がある期間を視覚的に表示する。

### 3.5 FR-005: 財務諸表の表示

#### 概要

PL・BS・CFの3つの財務諸表をWeb UI上で表示する。react-data-gridを使用したスプレッドシート形式の表示とする。

#### 表示仕様

- **行:** 勘定科目（階層構造をインデントで表現）
- **列:** 会計期間（FiscalYearSettingに基づく動的なラベル生成）
- **セル値:** 金額（千円単位または百万円単位で表示）
- **実績/予測の区別:** 実績期間と予測期間を視覚的に区別（背景色等）
- **タブ切替:** PL / BS / CF をタブで切り替え

#### 表示層の設計原則

表示層アダプター（PlGridAdapter, BsGridAdapter, CfGridAdapter）がドメインオブジェクトをreact-data-gridの形式に変換する。表示層に業務ロジック（計算や判断）を書かない。

---

## 4. 非機能要件

### 4.1 アーキテクチャ

#### 4.1.1 レイヤー構成

三層 + ドメインモデル方式を採用する（原則⑧）。

| レイヤー | 責務 | 業務ロジックの有無 |
|---|---|---|
| プレゼンテーション層 | Reactコンポーネント、グリッド表示 | なし（表示のみ） |
| アプリケーション層 | ユースケースの調整 | なし（調整のみ） |
| ドメインモデル | 全ての財務計算・判断・検証 | あり（全集中） |
| データソース層 | SQLiteへの永続化 | なし（保存のみ） |

#### 4.1.2 ディレクトリ構成

```
simplefam-mvp/
├── packages/
│   ├── domain/                  # ドメインモデル（フレームワーク非依存）
│   │   ├── account/             # AccountCode, Account, AccountHierarchy
│   │   ├── period/              # Period, Periods, FiscalYearSetting
│   │   ├── money/               # Money, GrowthRate, Ratio
│   │   ├── rule/                # Ruleインターフェース, 各種ルール実装
│   │   ├── computation/         # FormulaNode, DependencyGraph, AstEngine
│   │   └── statement/           # FinancialStatement, CashFlowStatement
│   ├── server/                  # Hono APIサーバー + Prisma
│   └── web/                     # Reactフロントエンド (Vite)
```

### 4.2 DDD設計原則の適用

MVP開発において、以下のDDD設計原則を遵守する。

| 原則 | 適用内容 | 検証方法 |
|---|---|---|
| ① 値オブジェクトの不変性 | Period, Money, AccountCode等をreadonly + Object.freezeで不変に | コードレビュー |
| ② コレクションオブジェクト | AccountHierarchy, Periods等で配列を包む | コードレビュー |
| ③ メソッド=ロジックの置き場所 | 各RuleがbuildFormulaNode()を持つ | 単体テスト |
| ④ メソッドを短く | 各メソッドは原則10行以内 | コードレビュー |
| ⑤ 肥大化したら分割 | インスタンス変数の使用パターンで分割判断 | リファクタリング |
| ⑥ 小さなドメインオブジェクト | GrowthRate, Ratio等の小さな単位で記述 | 単体テスト |
| ⑦ パッケージ参照方向 | eslint-plugin-importで参照方向を強制 | ESLint |
| ⑧ 三層+ドメインモデル | 業務ロジックはdomain/に集中 | ディレクトリ構造 |

### 4.3 データ永続化

Prisma + SQLiteを使用する。ドメインオブジェクトとDBテーブルは直接対応させず、Repositoryパターンで変換する。

#### MVPでのテーブル構成

| テーブル | 説明 | 主要カラム |
|---|---|---|
| financial_models | モデルのメタ情報 | id, name, fiscal_year_end_month |
| accounts | 勘定科目定義 | id, model_id, code, name, type, parent_code, sort_order |
| actual_values | 実績値 | id, model_id, account_code, fiscal_year, month, value |
| forecast_rules | 予測ルール | id, model_id, account_code, rule_type, params_json |
| computed_values | 計算結果のキャッシュ | id, model_id, account_code, fiscal_year, month, value |

---

## 5. API設計

### 5.1 エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | /api/models | モデル新規作成（シードデータ投入） |
| GET | /api/models/:id | モデル情報の取得 |
| GET | /api/models/:id/statements/pl | PLデータ取得 |
| GET | /api/models/:id/statements/bs | BSデータ取得 |
| GET | /api/models/:id/statements/cf | CFデータ取得 |
| PUT | /api/models/:id/rules | 予測ルールの更新 |
| POST | /api/models/:id/calculate | 再計算の実行 |
| GET | /api/models/:id/validate | 貸借一致検証 |

### 5.2 主要APIのリクエスト/レスポンス

**POST /api/models — モデル作成**

- **Request Body:** シードデータJSON（fiscalYearSetting, accounts, actuals, forecastRules）
- **Response:** 作成されたモデルID、計算結果の概要、貸借一致検証結果

**GET /api/models/:id/statements/pl — PL取得**

- **Response:** 行（科目の階層構造付き）× 列（期間）のグリッドデータ

---

## 6. テスト戦略

### 6.1 ドメイン層テスト（最重要）

ドメインオブジェクトは外部依存がない純粋なTypeScriptクラスであるため、単体テストが最も効果的。

| テスト対象 | 検証内容 |
|---|---|
| Period | 生成、比較、次期間算出、ラベル生成 |
| AccountHierarchy | 親子関係の構築、子科目取得、循環検出 |
| 各Rule実装 | FormulaNodeの正しい構築、計算結果の正確性 |
| AstEngine | トポロジカルソート、計算実行、キャッシュ |
| CashFlowStatement | 営業CF・投資CF・財務CFの算出、現預金計算 |
| 貸借一致検証 | 全期間での資産 = 負債+純資産の検証 |

### 6.2 統合テスト

シードデータ投入から貸借一致検証までのエンドツーエンドフローを検証する。

- シードデータ投入 → PL計算 → BS計算 → CF生成 → 現預金確定 → 貸借一致
- ルール変更 → 再計算 → 貸借一致の維持

### 6.3 テストデータ

検証用のサンプルシードデータを用意する。実績2期分 + 予測3期分のデータで、手計算で結果を検証可能な規模とする。

---

## 7. 開発計画

### 7.1 フェーズ別開発計画

#### Phase 1: ドメインモデル基盤

フレームワークに依存しない純粋なドメインオブジェクトを実装する。

- 値オブジェクト: AccountCode, AccountName, AccountType, Period, FiscalYearSetting, Money
- コレクション: AccountHierarchy, Periods
- エンティティ: Account
- 単体テストの作成

#### Phase 2: 計算エンジン

ASTベースの計算エンジンと各種ルールを実装する。

- FormulaNode階層（ConstantNode, AddNode, MultiplyNode, ReferenceNode等）
- DependencyGraph（トポロジカルソート、循環検出）
- AstEngine（評価、キャッシュ）
- Rule実装: ManualInput, GrowthRate, Percentage, Reference, BalanceChange, Sum, Subtract
- 各ルールの単体テスト

#### Phase 3: 財務諸表 + CF自動生成

財務諸表の構造化とCF自動生成、貸借一致検証を実装する。

- FinancialStatement（PL・BSの構造）
- CashFlowStatement（間接法CFの自動生成）
- 現預金計算フローの実装
- 貸借一致検証
- 統合テスト（シードデータ投入から貸借一致まで）

#### Phase 4: サーバー + フロントエンド

Hono APIサーバー、Prismaリポジトリ、React UIを実装する。

- Honoルートハンドラー
- Prismaスキーマ + Repository実装
- Reactコンポーネント + react-data-gridグリッド
- 表示層アダプター（PlGridAdapter, BsGridAdapter, CfGridAdapter）

### 7.2 開発優先順位

ドメインモデルを最優先で実装し、テストで正確性を確認した後に、インフラ層とプレゼンテーション層を構築する。これはドメインモデルが画面やDBの都合から独立していることを証明する意味も持つ。

---

## 8. 用語集

| 用語 | 説明 |
|---|---|
| PL (Profit & Loss) | 損益計算書。一定期間の収益と費用を表す |
| BS (Balance Sheet) | 貸借対照表。ある時点の資産・負債・純資産を表す |
| CF (Cash Flow) | キャッシュフロー計算書。現金の流れを表す |
| 間接法 | 税引前利益から出発してCFを算出する方法 |
| AST | Abstract Syntax Tree。計算式を木構造で表現したもの |
| トポロジカルソート | 依存関係に循環がない有向グラフを順序付けするアルゴリズム |
| 葉科目 | 子科目を持たない末端の科目。値の直接入力対象 |
| シードデータ | システム初期化用のデータ。科目定義、実績値、ルールを含む |
| ドメインオブジェクト | 業務データと業務ロジックを一体化したオブジェクト |
| 値オブジェクト | 不変であり、値の同一性で比較されるオブジェクト |
| コレクションオブジェクト | 配列等のコレクションを包む専用クラス |

---

*— End of Document —*
