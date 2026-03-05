# AccountHierarchy への科目追加・構造変更 — 要求

**対象:** AccountHierarchy に対する Account 追加と階層構造の動的変更
**日付:** 2026-03-05

---

## 1. 背景

現在の `AccountHierarchy` は `static build(accounts: Account[])` で一括構築するのみで、構築後に科目を追加したり階層構造を変更する手段がない。

実際の財務モデリングでは、以下のような操作が必要になる:

- 複数の科目を1つの親カテゴリにまとめる（例: 給与手当と法定福利費を「人件費」カテゴリの子にする）
- 既存の科目をより細かい子科目に分割する（例: 給与手当を「従業員数」と「一人当たり給与」に分ける）

ただし、財務諸表の基本構造を構成する科目（構造科目）は削除や階層変更ができないよう保護する必要がある。

## 2. ユーザーストーリー

### US-01: 親科目の追加と子科目のグループ化

> ユーザーとして、既存の複数科目をグループ化する親科目を追加し、それらの科目を子として配置したい。
> これにより、勘定科目の階層を業務に合った構造に整理できる。

**例:**
- 「人件費」という親科目を新規追加する
- 「給与手当」と「法定福利費」を指定し、それらの親として「人件費」を挿入する
- 「給与手当」と「法定福利費」の parentCode が自動的に「人件費」に変更される

### US-02: LEAF科目の子科目への分割

> ユーザーとして、末端（LEAF）の科目に子科目を追加して詳細化したい。
> これにより、より細かい粒度で予測ルールを設定できるようになる。

**例:**
- 「給与手当」（LEAF科目）を指定し、「従業員数」と「一人当たり給与」を子科目として追加する
- 分割後、「給与手当」はLEAFではなくなり、「従業員数」と「一人当たり給与」が新たなLEAFになる

### US-03: 構造科目の保護

> ユーザーとして、財務諸表の基本構造（PL/BS/CFのフレームワーク科目）が誤って削除・変更されないようにしたい。
> これにより、財務諸表としての整合性が常に維持される。

## 3. 機能要件

### FR-01: 親科目の追加（groupUnderNewParent）

- グループ化する子科目群を指定して、新しい親科目を追加できること
- 追加時に以下のバリデーションを行うこと:
  - 同じ code の Account が既に存在しないこと（重複禁止）
  - 指定された子科目群が全て同じ parentCode を持つこと（同一階層に属すること）
  - 追加後に循環参照が発生しないこと
- 処理の流れ:
  1. 子科目群の現在の parentCode を取得し、全て同一であることを検証
  2. 新しい親科目を追加（parentCode = 子科目群の元の parentCode）
  3. 子科目群の parentCode を新しい親科目の code に変更
- 操作は新しい AccountHierarchy インスタンスを返すこと（不変性の維持）

### FR-02: LEAF科目の分割（splitAccount）

- LEAF科目を指定して、子科目を追加することで分割できること
- 分割時に以下のバリデーションを行うこと:
  - 分割対象の科目がLEAF科目であること（`isLeaf() === true`）
  - 追加する子科目の code が既存の科目と重複しないこと
  - 追加後に循環参照が発生しないこと
- 処理の流れ:
  1. 対象科目が LEAF であることを検証
  2. 新しい子科目群を追加（parentCode = 対象科目の code）
  3. 対象科目は LEAF から中間ノード（親科目）に変わる
- 操作は新しい AccountHierarchy インスタンスを返すこと（不変性の維持）

### FR-03: 構造科目の保護

- 財務諸表の基本構造を構成する科目（構造科目）は、削除および parentCode の変更ができないこと
- `Account` に `isStructural: boolean` フラグを追加し、構造科目を識別すること
- 構造科目に対して禁止される操作:
  - **削除**: 構造科目は削除できない
  - **親変更**: 構造科目の parentCode を変更できない（階層構造の固定）
- 構造科目に対して許可される操作:
  - **子科目の追加**: 構造科目の下に子科目を追加することは可能（分割・詳細化）
  - **親科目の挿入**: 構造科目の上に新しい親を挿入することは可能（ただし構造科目自体の parentCode は変わるため、構造科目の直上への挿入は不可）

#### 構造科目一覧

**PL（損益計算書）:**

| コード | 科目名 |
|---|---|
| revenue | 売上高 |
| cogs | 売上原価 |
| gross_profit | 売上総利益 |
| sga | 販管費 |
| operating_income | 営業利益 |
| non_operating | 営業外損益 |
| ordinary_income | 経常利益 |
| extraordinary | 特別損益 |
| pbt | 税引前利益 |
| tax | 法人税等 |
| net_income | 当期純利益 |

**BS（貸借対照表）:**

| コード | 科目名 |
|---|---|
| cash | 現金及び預金 |
| current_assets | 流動資産合計 |
| ppe_net | 有形固定資産 |
| intangible_assets | 無形固定資産 |
| investments | 投資その他の資産 |
| fixed_assets | 固定資産合計 |
| total_assets | 資産合計 |
| current_liabilities | 流動負債合計 |
| fixed_liabilities | 固定負債合計 |
| total_liabilities | 負債合計 |
| capital | 資本金等 |
| retained_earnings | 利益剰余金等 |
| total_equity | 純資産合計 |
| total_le | 負債・純資産合計 |

**CF（キャッシュフロー計算書）:**

| コード | 科目名 |
|---|---|
| cfo_total | 営業CF合計 |
| cfi_total | 投資CF合計 |
| cff_total | 財務CF合計 |
| opening_cash | 期初現預金 |
| net_cash_change | 当期現預金の増減 |

### FR-04: Account への isStructural フラグ追加

- `Account` クラスに `isStructural: boolean` プロパティを追加すること
- `Account.create()` のパラメータに `isStructural` を追加（デフォルト: `false`）
- シードデータの JSON で `isStructural: true` を指定可能にすること
- `isStructural` は readonly であり、構築後に変更できないこと

## 4. 受け入れ条件

### AC-01: 親科目追加シナリオ

1. 「給与手当」と「法定福利費」を指定して `groupUnderNewParent()` を呼び出し、「人件費」を親として追加できる
2. 「給与手当」と「法定福利費」が同じ parentCode を持つことが検証される
3. 追加後、「人件費」の parentCode は「給与手当」「法定福利費」の元の parentCode と同じになる
4. 追加後、`getChildren(personnel_cost)` が「給与手当」と「法定福利費」を返す
5. 追加後、`getDepth()` が正しく更新されている
6. 異なる parentCode を持つ科目群を指定するとエラーになる

### AC-02: LEAF科目分割シナリオ

1. 「給与手当」（LEAF科目）を指定して `splitAccount()` を呼び出し、「従業員数」と「一人当たり給与」を子科目として追加できる
2. LEAF科目でない科目を指定するとエラーになる
3. 追加後、`getChildren(salary)` が「従業員数」と「一人当たり給与」を返す
4. 追加後、`isLeaf(salary)` が false を返す
5. 追加後、`getLeaves()` に「従業員数」と「一人当たり給与」が含まれる

### AC-03: 構造科目保護シナリオ

1. 構造科目（例: `revenue`, `gross_profit`, `operating_income`）を削除しようとするとエラーになる
2. 構造科目の parentCode を変更しようとするとエラーになる
3. 構造科目の下に子科目を追加する操作は成功する
4. BS/CF の構造科目も同様に保護される

### AC-04: バリデーション

1. 既存の code と同じ code の Account を追加しようとするとエラーになる
2. 存在しない parentCode を指定するとエラーになる
3. 循環参照を生む変更を行おうとするとエラーになる
4. LEAF でない科目に対して `splitAccount()` を呼び出すとエラーになる
5. 異なる parentCode を持つ科目群に対して `groupUnderNewParent()` を呼び出すとエラーになる

### AC-05: 不変性

1. `groupUnderNewParent()` は元の AccountHierarchy を変更しない
2. `splitAccount()` は元の AccountHierarchy を変更しない
3. 返却された新しい AccountHierarchy は正しい状態を持つ

### AC-06: isStructural フラグ

1. `Account.create()` で `isStructural: true` を指定できる
2. `isStructural` を指定しない場合、デフォルトで `false` になる
3. `account.isStructural` で構造科目かどうかを判定できる

## 5. 制約事項

- AccountHierarchy の不変性（イミュータブル）パターンを維持すること
- 既存の `static build()` や各種クエリメソッドの動作を変えないこと
- ドメインモデル層（account パッケージ）内で完結すること
- 構造科目の保護は AccountHierarchy の変更操作内で実施すること（操作前にバリデーション）

---

*-- End of Document --*
