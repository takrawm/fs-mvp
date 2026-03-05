# AccountHierarchy への科目追加・構造変更 — タスクリスト

**対象:** design.md に基づく実装タスク
**日付:** 2026-03-05

---

## Phase 1: Account への isStructural フラグ追加

- [ ] 1-1. `Account.ts` に `isStructural: boolean` プロパティを追加
  - コンストラクタパラメータに追加
  - `create()` のパラメータに `isStructural?: boolean` を追加（デフォルト: `false`）
  - `Object.freeze(this)` で不変性を維持
- [ ] 1-2. `Account.ts` に `withParentCode()` メソッドを追加
  - `isStructural === true` の場合はエラーをスロー
  - 新しい Account インスタンスを返す
- [ ] 1-3. `Account.test.ts` にテストを追加
  - `isStructural: true` で作成できること
  - `isStructural` 省略時にデフォルト `false` になること
  - `withParentCode()` で新しい Account が返ること
  - 構造科目に `withParentCode()` でエラーになること
- [ ] 1-4. 既存テストが全てパスすることを確認

## Phase 2: AccountHierarchy に groupUnderNewParent を追加

- [ ] 2-1. `AccountHierarchy.ts` に `groupUnderNewParent()` メソッドを追加
  - newParent.code の重複チェック
  - childCodes の存在チェック
  - childCodes の parentCode 同一性チェック
  - childCodes に構造科目が含まれないことのチェック
  - 新しい Account 配列を構築し `build()` で新インスタンスを返す
- [ ] 2-2. `AccountHierarchy.test.ts` に groupUnderNewParent のテストを追加
  - 正常系: 2科目をグループ化
  - 異常系: 異なる parentCode の科目を指定
  - 異常系: 重複 code の親科目を追加
  - 異常系: 存在しない childCode を指定
  - 異常系: 構造科目を childCodes に指定
  - 不変性: 元の AccountHierarchy が変更されないこと
- [ ] 2-3. 既存テストが全てパスすることを確認

## Phase 3: AccountHierarchy に splitAccount を追加

- [ ] 3-1. `AccountHierarchy.ts` に `splitAccount()` メソッドを追加
  - targetCode の存在チェック
  - targetCode が LEAF であることのチェック
  - newChildren の code 重複チェック
  - newChildren の parentCode が targetCode と一致することのチェック
  - 新しい Account 配列を構築し `build()` で新インスタンスを返す
- [ ] 3-2. `AccountHierarchy.test.ts` に splitAccount のテストを追加
  - 正常系: LEAF科目を2つに分割
  - 異常系: LEAF でない科目を指定
  - 異常系: 存在しない科目を指定
  - 異常系: 重複 code の子科目を追加
  - 異常系: parentCode 不一致の子科目
  - 不変性: 元の AccountHierarchy が変更されないこと
- [ ] 3-3. 既存テストが全てパスすることを確認

## Phase 4: ドキュメント更新

- [ ] 4-1. `docs/functional-design.md` の Account クラス設計を更新
  - `isStructural` プロパティの追記
  - `withParentCode()` メソッドの追記
- [ ] 4-2. `docs/functional-design.md` の AccountHierarchy クラス設計を更新
  - `groupUnderNewParent()` メソッドの追記
  - `splitAccount()` メソッドの追記

---

*-- End of Document --*
