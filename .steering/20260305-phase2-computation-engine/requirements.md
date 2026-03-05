# Phase 2: 計算エンジン — 要求定義

**対象:** computation パッケージ + rule パッケージの実装
**日付:** 2026-03-05

---

## 1. 目的

Phase 1 で構築したドメインモデル基盤（account, period, money）を土台に、AST ベースの計算エンジンと 7 種類の計算ルールを実装する。これにより、実績値から予測値を自動算出する中核機能を実現する。

## 2. 実装スコープ

### 2.1 含むもの

| ID | 機能 | 概要 |
|----|------|------|
| P2-001 | FormulaNode 階層 | 抽象構文木ノードのインターフェースと 6 種の具体ノード（Constant, Add, Subtract, Multiply, Reference, Negate） |
| P2-002 | EvaluationCache | 計算結果のメモ化キャッシュ |
| P2-003 | NodeRegistry | FormulaNode の管理と ID ベースのルックアップ |
| P2-004 | DependencyGraph | ノード間の依存関係グラフ、トポロジカルソート、循環検出 |
| P2-005 | AstEngine | ルール登録・依存順計算・結果取得を統合する計算実行エンジン |
| P2-006 | Rule インターフェース | 全ルール共通の契約（Rule, RuleType, RuleBuildContext） |
| P2-007 | ManualInputRule | 手入力ルール → ConstantNode |
| P2-008 | GrowthRateRule | 成長率ルール → MultiplyNode(prevPeriodRef, 1 + rate) |
| P2-009 | PercentageRule | 割合ルール → MultiplyNode(referenceAccountRef, ratio) |
| P2-010 | ReferenceRule | 参照ルール → ReferenceNode |
| P2-011 | BalanceChangeRule | 残高変動ルール → AddNode(prevPeriodBalanceRef, changeAmount) |
| P2-012 | SumRule | 合計ルール → AddNode(children) |
| P2-013 | SubtractRule | 差引ルール → SubtractNode(minuend, subtrahend) |

### 2.2 含まないもの

- 財務諸表の構造化（Phase 3）
- CF 自動生成（Phase 3）
- 貸借一致検証（Phase 3）
- サーバー・UI（Phase 4）

## 3. 前提条件

Phase 1 の以下のパッケージが実装・テスト済みであること：

- **account パッケージ:** AccountCode, AccountName, AccountType, Account, AccountHierarchy
- **period パッケージ:** Period, FiscalYearSetting, Periods
- **money パッケージ:** Money, GrowthRate, Ratio

## 4. 実績値と予測値の区分

### 4.1 実績期間のデータ保護

インポートされた実績値（actual values）は計算エンジンによる自動計算の対象外とする。

- 実績期間の値は `ConstantNode` として登録され、ルールによる上書きは行われない
- 実績値の変更はユーザーによる手動編集のみを許可する（Phase 4 以降の UI スコープ）
- `AstEngine.registerRules()` は予測期間（forecast periods）に対してのみルールから FormulaNode を構築する

### 4.2 ルール適用範囲

```
期間軸:  [実績1期] [実績2期] | [予測1期] [予測2期] [予測3期]
                              ↑ 境界
実績期間: ConstantNode（インポート値をそのまま保持）
予測期間: Rule.buildFormulaNode() で AST ノードを構築 → 自動計算
```

- 予測ルール（forecast_rules）は予測期間にのみ適用される
- 予測期間の最初の期（予測1期）が前期値を参照する場合、実績最終期の ConstantNode を参照する
- SumRule 等の集約ルールは実績・予測の区分に関係なく、子ノードの値を合算する（子ノード自体が ConstantNode か計算ノードかは問わない）

### 4.3 キャッシュ戦略

計算エンジンでは 2 層のキャッシュを使用する。

#### ノードレベルキャッシュ（EvaluationCache — Phase 2 スコープ）

- 1 回の `compute()` 呼び出し内で、同一ノードの重複評価を防ぐメモ化キャッシュ
- `evaluate()` 時にキャッシュヒットすれば再計算をスキップし、キャッシュ済みの値を返す
- `compute()` 実行のたびに `clear()` してから再評価する（差分計算は行わない）
- ConstantNode（実績値）もキャッシュ対象とし、参照時の一貫性を保つ

#### 永続キャッシュ（computed_values テーブル — Phase 4 スコープ）

- 計算結果を DB に保存し、再計算なしでの表示を可能にする
- ルールや実績値が変更された場合は再計算を実行して更新する
- Phase 2 のスコープ外だが、EvaluationCache の設計はこの拡張を阻害しないようにする

## 5. ユーザーストーリー

1. **開発者として**、各計算ルールが `buildFormulaNode()` で正しい AST ノードを構築し、期待通りの計算結果を返すことを単体テストで確認できる
2. **開発者として**、AstEngine に複数のルールと実績値を登録し、依存関係に従って全科目・全期間の値が正しく算出されることを確認できる
3. **開発者として**、循環依存が存在する場合にエラーが検出され、関与する科目がエラーメッセージに含まれることを確認できる
4. **開発者として**、実績値が計算実行後も変更されず、インポート時の値がそのまま保持されることを確認できる
5. **開発者として**、予測期間のみにルールが適用され、実績期間にはルールが適用されないことを確認できる

## 6. 受け入れ条件

### 6.1 FormulaNode 階層

- [ ] FormulaNode インターフェースが `nodeId`, `evaluate()`, `getDependencies()` を定義していること
- [ ] FormulaNodeRef インターフェースが `accountCode`, `period`, `resolve()` を定義していること
- [ ] ConstantNode が指定値をそのまま返すこと（依存なし）
- [ ] AddNode が全 operand の合計を返すこと
- [ ] SubtractNode が minuend - subtrahend を返すこと
- [ ] MultiplyNode が base × factor を返すこと
- [ ] ReferenceNode が参照先の値をそのまま返すこと
- [ ] NegateNode が符号反転した値を返すこと
- [ ] 各ノードの `evaluate()` が EvaluationCache を参照してメモ化すること

### 6.2 EvaluationCache

- [ ] nodeId をキーとして Money を保存・取得できること
- [ ] `has()` でキャッシュの存在判定ができること
- [ ] `clear()` でキャッシュを全消去できること

### 6.3 NodeRegistry

- [ ] FormulaNode を登録し、nodeId で取得できること
- [ ] `getOrCreate()` で既存ノードがあればそれを返し、なければファクトリで生成して登録すること
- [ ] `buildNodeId()` が AccountCode と Period からユニークな ID を生成すること

### 6.4 DependencyGraph

- [ ] NodeRegistry から依存グラフを構築できること
- [ ] Kahn のアルゴリズム（入次数ベース）でトポロジカルソートを提供すること
- [ ] 循環依存を検出し、関与する AccountCode の配列を返すこと

### 6.5 AstEngine — 実績値の保護

- [ ] `registerRules()` が実績期間の値を ConstantNode として登録すること
- [ ] `registerRules()` が予測期間に対してのみルールから FormulaNode を構築すること
- [ ] 実績期間に対してルールが適用されないこと（ConstantNode が上書きされないこと）
- [ ] `compute()` 実行後、実績値がインポート時の値と一致すること
- [ ] `compute()` がトポロジカルソート順に全ノードを評価し、ComputationResult を返すこと
- [ ] `getValue()` で AccountCode と Period を指定して計算結果を取得できること
- [ ] 計算エラー（循環依存等）が ComputationResult.errors に含まれること

### 6.6 Rule 実装（7 種類）

- [ ] 全ルールが Rule インターフェースを実装していること
- [ ] ManualInputRule: 固定値の ConstantNode を返すこと
- [ ] GrowthRateRule: 前期値 × (1 + rate) の MultiplyNode を返すこと
- [ ] PercentageRule: 参照科目 × ratio の MultiplyNode を返すこと
- [ ] ReferenceRule: 参照先ノードの ReferenceNode を返すこと（期間オフセット対応）
- [ ] BalanceChangeRule: 前期残高 + 変動額の AddNode を返すこと
- [ ] SumRule: AccountHierarchy から子科目を取得し、全子科目の AddNode を返すこと
- [ ] SubtractRule: minuend - subtrahend の SubtractNode を返すこと

### 6.7 テスト

- [ ] 各 FormulaNode 具体クラスの `evaluate()` テスト（正常系）
- [ ] 各ルールの `buildFormulaNode()` が正しいノードツリーを返すことのテスト
- [ ] DependencyGraph のトポロジカルソートが正しい順序を返すことのテスト
- [ ] DependencyGraph の循環検出テスト
- [ ] AstEngine の統合テスト（3〜5 科目 × 2 期間の簡易モデルで計算結果を検証）
- [ ] 実績値が `compute()` 後も変更されないことのテスト
- [ ] 予測期間のみにルールが適用されることのテスト
- [ ] 全テストがパスすること

### 6.8 パッケージ構造

- [ ] computation パッケージが account, period, money, rule を参照すること
- [ ] rule パッケージが account, period, money を参照すること
- [ ] 上記以外のパッケージ参照方向違反がないこと
- [ ] computation パッケージと rule パッケージに index.ts でエクスポートが定義されていること

## 7. 制約事項

- TypeScript strict モードで実装
- ドメイン層はフレームワーク非依存（Prisma, Hono, React 等に依存しない）
- 全値オブジェクトは不変（readonly + Object.freeze）
- コレクションは ReadonlyMap / readonly 配列で公開
- `docs/functional-design.md` セクション 4.5〜4.6 の型定義に準拠
- 実績値は計算エンジンによって上書きされてはならない（ConstantNode で保護）

---

*— End of Document —*
