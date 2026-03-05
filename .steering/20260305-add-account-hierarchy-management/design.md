# AccountHierarchy への科目追加・構造変更 — 設計

**対象:** requirements.md に基づく実装設計
**日付:** 2026-03-05

---

## 1. 変更対象ファイル

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `packages/domain/src/account/Account.ts` | 修正 | `isStructural` プロパティ追加 |
| `packages/domain/src/account/Account.test.ts` | 修正 | `isStructural` のテスト追加 |
| `packages/domain/src/account/AccountHierarchy.ts` | 修正 | `insertParentAbove()`, `addChildrenTo()` 追加 |
| `packages/domain/src/account/AccountHierarchy.test.ts` | 修正 | 新メソッドのテスト追加 |
| `docs/functional-design.md` | 修正 | Account, AccountHierarchy のクラス設計更新 |

---

## 2. 実装アプローチ

### 2.1 Account への `isStructural` フラグ追加

`Account` クラスに `isStructural: boolean` を追加する。既存の `create()` ファクトリメソッドのパラメータに追加し、デフォルト値は `false` とする。

**変更後の Account:**

```typescript
class Account {
  readonly code: AccountCode;
  readonly name: AccountName;
  readonly type: AccountType;
  readonly parentCode: AccountCode | null;
  readonly sortOrder: number;
  readonly isStructural: boolean;           // ← 追加

  static create(params: {
    code: string;
    name: string;
    type: AccountType;
    parentCode: string | null;
    sortOrder: number;
    isStructural?: boolean;                 // ← 追加（デフォルト: false）
  }): Account;

  isRoot(): boolean;
  belongsTo(type: AccountType): boolean;
}
```

**設計ポイント:**
- `isStructural` は省略可能（`?`）にし、既存の `Account.create()` 呼び出しに影響を与えない
- `Object.freeze(this)` で不変性を保つ（既存パターンと同じ）

### 2.2 Account の `changeParent()` メソッド追加

`insertParentAbove()` の内部で既存 Account の `parentCode` を変更した新しいインスタンスを生成する必要がある。Account はイミュータブルなので、コピーメソッドを追加する。

```typescript
class Account {
  // ...既存メソッド...

  changeParent(newParentCode: AccountCode | null): Account;
}
```

**設計ポイント:**
- 構造科目の場合はエラーをスローする（`isStructural === true` の Account は parentCode を変更できない）
- 新しい Account インスタンスを返す（元のインスタンスは変更しない）
- `code`, `name`, `type`, `sortOrder`, `isStructural` はそのまま引き継ぐ

### 2.3 AccountHierarchy への変更操作メソッド追加

#### `insertParentAbove()` — 既存科目の上に親科目を挿入

```typescript
class AccountHierarchy {
  // ...既存メソッド...

  insertParentAbove(
    newParent: Account,
    childCodes: AccountCode[],
  ): AccountHierarchy;
}
```

**処理フロー:**

```
1. バリデーション
   ├─ newParent.code が既存科目と重複しないか
   ├─ childCodes が全て存在するか
   ├─ childCodes の科目が全て同じ parentCode を持つか
   └─ childCodes に構造科目が含まれていないか（parentCode 変更不可）

2. 新しい Account 配列の構築
   ├─ newParent を追加（parentCode = childCodes の元の parentCode）
   ├─ childCodes の各 Account を changeParent(newParent.code) で再生成
   └─ その他の Account はそのまま

3. AccountHierarchy.build() で新しいインスタンスを構築
   └─ 循環参照検出も自動で実行される
```

**バリデーションエラー:**

| 条件 | エラーメッセージ |
|---|---|
| newParent.code が既存と重複 | `Account "${code}" already exists` |
| childCodes に存在しない科目 | `Account "${code}" not found` |
| childCodes の parentCode が不一致 | `All children must have the same parentCode` |
| childCodes に構造科目が含まれる | `Cannot change parentCode of structural account "${code}"` |

#### `addChildrenTo()` — LEAF科目に子科目を追加

```typescript
class AccountHierarchy {
  // ...既存メソッド...

  addChildrenTo(
    targetCode: AccountCode,
    newChildren: Account[],
  ): AccountHierarchy;
}
```

**処理フロー:**

```
1. バリデーション
   ├─ targetCode が存在するか
   ├─ targetCode が LEAF 科目か（isLeaf() === true）
   └─ newChildren の code が既存科目と重複しないか

2. 新しい Account 配列の構築
   ├─ 既存の Account はそのまま
   └─ newChildren を追加（各 parentCode = targetCode）

3. AccountHierarchy.build() で新しいインスタンスを構築
   └─ 循環参照検出も自動で実行される
```

**注意:** `newChildren` の各 Account の `parentCode` は `targetCode` と一致している必要がある。不一致の場合はエラーとする。

**バリデーションエラー:**

| 条件 | エラーメッセージ |
|---|---|
| targetCode が存在しない | `Account "${code}" not found` |
| targetCode が LEAF でない | `Account "${code}" is not a leaf account` |
| newChildren の code が重複 | `Account "${code}" already exists` |
| newChildren の parentCode が targetCode と不一致 | `Child account "${code}" must have parentCode "${targetCode}"` |

### 2.4 不変性の維持パターン

全ての変更操作は以下のパターンで不変性を維持する:

```
既存 AccountHierarchy（変更なし）
        │
        ├── 既存 Account[] を取得
        ├── 変更対象を新インスタンスに差し替え
        ├── 新規 Account を追加
        │
        └── AccountHierarchy.build(newAccounts)
                → 新しい AccountHierarchy を返す
```

`AccountHierarchy.build()` を再利用することで:
- 循環参照検出が自動で行われる
- childMap の再構築が保証される
- 既存のバリデーションロジックとの一貫性が保たれる

---

## 3. 影響範囲

### 3.1 既存コードへの影響

- **Account.create()**: `isStructural` パラメータの追加（省略可能なため既存呼び出しに影響なし）
- **AccountHierarchy.build()**: 変更なし
- **既存テスト**: `Account.create()` に `isStructural` を渡していないものはデフォルト `false` で動作（影響なし）

### 3.2 上流パッケージへの影響

`account` パッケージは最上流であり、`period`, `rule`, `computation`, `statement` から参照されている。

- `Account` への `isStructural` 追加は既存のインターフェースを壊さない（オプショナルパラメータ）
- `AccountHierarchy` への新メソッド追加は既存メソッドに影響しない
- 上流パッケージの変更は不要

### 3.3 DB スキーマへの影響

`accounts` テーブルに `is_structural BOOLEAN DEFAULT FALSE` カラムの追加が必要になるが、これは本タスクのスコープ外とする（ドメインモデル層のみ対応）。

---

## 4. テスト方針

### 4.1 Account テスト追加

| テストケース | 期待結果 |
|---|---|
| `isStructural: true` で作成 | `account.isStructural === true` |
| `isStructural` 省略で作成 | `account.isStructural === false` |
| 構造科目に `changeParent()` | エラースロー |
| 非構造科目に `changeParent()` | 新しい Account が返る |

### 4.2 AccountHierarchy — insertParentAbove テスト

| テストケース | 期待結果 |
|---|---|
| 正常系: 2科目をグループ化 | 新しい親科目の下に2科目が配置 |
| 異なる parentCode の科目を指定 | エラースロー |
| 重複 code の親科目を追加 | エラースロー |
| 存在しない childCode を指定 | エラースロー |
| 構造科目を childCodes に指定 | エラースロー |
| 元の AccountHierarchy が不変 | 元のインスタンスは変更なし |

### 4.3 AccountHierarchy — addChildrenTo テスト

| テストケース | 期待結果 |
|---|---|
| 正常系: LEAF科目を2つに分割 | 対象科目の下に2子科目、対象は LEAF でなくなる |
| LEAF でない科目を指定 | エラースロー |
| 存在しない科目を指定 | エラースロー |
| 重複 code の子科目を追加 | エラースロー |
| parentCode 不一致の子科目 | エラースロー |
| 元の AccountHierarchy が不変 | 元のインスタンスは変更なし |

---

*-- End of Document --*
