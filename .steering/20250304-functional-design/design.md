# 機能設計書作成の設計

## 実装アプローチ

product-requirements.md の構成を分析し、機能設計書として必要な要素を抽出・再構成する。既存の要求定義書の内容を重複なく参照しつつ、実装者が参照しやすい形式で整理する。

## 変更するコンポーネント

| 対象 | 操作 |
|------|------|
| `docs/functional-design.md` | 新規作成 |

## データ構造の変更

なし（ドキュメントのみの追加）

## 機能設計書の構成案

### 1. システム構成図

- 三層 + ドメインモデル方式のレイヤー構成
- パッケージ参照方向（account ← period ← rule ← computation ← statement）
- フロントエンド・バックエンド・DBの関係

### 2. データモデル定義（ER図）

- product-requirements.md 4.3節のテーブル構成をER図化
- financial_models, accounts, actual_values, forecast_rules, computed_values の関係

### 3. 機能ごとのアーキテクチャ

- FR-001: シードデータ投入の処理フロー
- FR-002: 計算ルール・ASTエンジンの処理フロー
- FR-003: CF自動生成・現預金計算の処理フロー
- FR-004: 貸借一致検証の処理フロー
- FR-005: 財務諸表表示の処理フロー

### 4. コンポーネント設計

- ドメイン層パッケージ構成（account, period, money, rule, computation, statement）
  - 各パッケージのクラス/インターフェースの型定義・メソッドシグネチャを記載
  - 値オブジェクトの不変性パターン（readonly + Object.freeze + private constructor + static factory）
  - パッケージ間のインポートルール表
- 表示層アダプター（PlGridAdapter, BsGridAdapter, CfGridAdapter）の責務
- サーバー層のルートハンドラーとRepositoryの関係

### 5. ユースケース図

- アクター: ユーザー（開発者/利用者）
- ユースケース: シードデータ投入、予測計算、財務諸表表示、貸借一致検証

### 6. 画面遷移図

- タブ切替（PL / BS / CF）の遷移
- MVPでは単一画面のタブ切替のみ（複数ページなし）

### 7. ワイヤフレーム

- 財務諸表グリッドのレイアウト（行: 科目、列: 期間）
- 実績/予測の区別表示
- タブUIの配置

### 8. API設計

- product-requirements.md 5節の内容を拡張
- 各エンドポイントのリクエスト/レスポンススキーマを詳細化
- エラーレスポンスの形式

## 影響範囲の分析

| 影響対象 | 内容 |
|----------|------|
| docs/ | functional-design.md を新規追加。他ドキュメントへの影響なし |
| コード | なし（ドキュメントのみ） |
