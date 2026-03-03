# 機能設計書作成の要求

## 作業概要

`docs/product-requirements.md`（プロダクト要求定義書）を踏まえ、`docs/functional-design.md`（機能設計書）を作成する。

## ユーザーストーリー

**As a** 開発者  
**I want** 機能設計書が存在すること  
**So that** 実装時に機能ごとのアーキテクチャ、データモデル、画面構成、API仕様を参照できる

## 変更・追加する機能の説明

- 永続的ドキュメント `docs/functional-design.md` を新規作成する
- product-requirements.md に記載されている内容を基に、実装に必要な詳細設計を整理する
- 機能設計書として以下の要素を含める

## 受け入れ条件

1. `docs/functional-design.md` が存在すること
2. 以下のセクションが含まれること
   - 機能ごとのアーキテクチャ
   - システム構成図
   - データモデル定義（ER図含む）
   - コンポーネント設計
   - ユースケース図
   - 画面遷移図
   - ワイヤフレーム
   - API設計（product-requirements.md の内容を拡張・整理）
3. product-requirements.md の内容と矛盾がないこと
4. Mermaid記法またはASCIIアートで図表を記載すること（独立したdiagramsフォルダは作成しない）

## 制約事項

- 図表は `docs/` 内の該当ドキュメントに直接記載する
- 必要最小限の図表に留め、メンテナンスコストを抑える
- 既存の `docs/product-requirements.md` は変更しない（参照のみ）
