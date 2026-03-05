# AccountHierarchy への科目追加・構造変更 — タスクリスト

**対象:** design.md に基づく実装タスク
**日付:** 2026-03-05

---

## Phase 1: Account への side / isStructural 追加

- [ ] 1-1. `AccountSide.ts` を新規作成
  - `type AccountSide = "DEBIT" | "CREDIT"` を定義
  - `index.ts` にエクスポートを追加
- [ ] 1-2. `Account.ts` に `side: AccountSide` と `isStructural: boolean` を追加
  - コンストラクタパラメータに追加
  - `create()` のパラメータに `side: AccountSide`（必須）と `isStructural?: boolean`（デフォルト: `false`）を追加
  - `get aggregationSign(): 1 | -1` ゲッターを追加（`side` から導出）
  - `Object.freeze(this)` で不変性を維持
- [ ] 1-3. `Account.ts` に `changeParent()` メソッドを追加
  - `isStructural === true` の場合はエラーをスロー
  - 新しい Account インスタンスを返す
- [ ] 1-4. 既存の `Account.create()` 呼び出し箇所に `side` パラメータを追加
  - `Account.test.ts` の既存テスト
  - `AccountHierarchy.test.ts` の既存テスト
- [ ] 1-5. `Account.test.ts` に新規テストを追加
  - `side: "DEBIT"` で `aggregationSign` が `1` になること
  - `side: "CREDIT"` で `aggregationSign` が `-1` になること
  - `isStructural: true` で作成できること
  - `isStructural` 省略時にデフォルト `false` になること
  - `changeParent()` で新しい Account が返ること
  - 構造科目に `changeParent()` でエラーになること
- [ ] 1-6. 既存テストが全てパスすることを確認

## Phase 2: AccountHierarchy に insertParentAbove() を追加

- [ ] 2-1. `AccountHierarchy.ts` に `insertParentAbove()` メソッドを追加
  - newParent.code の重複チェック
  - childCodes の存在チェック
  - childCodes の parentCode 同一性チェック
  - childCodes に構造科目が含まれないことのチェック
  - 新しい Account 配列を構築し `build()` で新インスタンスを返す
- [ ] 2-2. `AccountHierarchy.test.ts` に insertParentAbove のテストを追加
  - 正常系: 2科目をグループ化
  - 異常系: 異なる parentCode の科目を指定
  - 異常系: 重複 code の親科目を追加
  - 異常系: 存在しない childCode を指定
  - 異常系: 構造科目を childCodes に指定
  - 不変性: 元の AccountHierarchy が変更されないこと
- [ ] 2-3. 既存テストが全てパスすることを確認

## Phase 3: AccountHierarchy に addChildrenTo() を追加

- [ ] 3-1. `AccountHierarchy.ts` に `addChildrenTo()` メソッドを追加
  - targetCode の存在チェック
  - targetCode が LEAF であることのチェック
  - newChildren の code 重複チェック
  - newChildren の parentCode が targetCode と一致することのチェック
  - 新しい Account 配列を構築し `build()` で新インスタンスを返す
- [ ] 3-2. `AccountHierarchy.test.ts` に addChildrenTo のテストを追加
  - 正常系: LEAF科目に子科目を2つ追加
  - 異常系: LEAF でない科目を指定
  - 異常系: 存在しない科目を指定
  - 異常系: 重複 code の子科目を追加
  - 異常系: parentCode 不一致の子科目
  - 不変性: 元の AccountHierarchy が変更されないこと
- [ ] 3-3. 既存テストが全てパスすることを確認

## Phase 4: ドキュメント更新

- [ ] 4-1. `docs/functional-design.md` の Account クラス設計を更新
  - `AccountSide` 型の追記
  - `side` プロパティ、`aggregationSign` ゲッターの追記
  - `isStructural` プロパティの追記
  - `changeParent()` メソッドの追記
- [ ] 4-2. `docs/functional-design.md` の AccountHierarchy クラス設計を更新
  - `insertParentAbove()` メソッドの追記
  - `addChildrenTo()` メソッドの追記
  - requirements.md に記載された `getAllAccounts()` メソッドの追記

---

*-- End of Document --*
