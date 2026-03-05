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

## 4. ユーザーストーリー

1. **開発者として**、各計算ルールが `buildFormulaNode()` で正しい AST ノードを構築し、期待通りの計算結果を返すことを単体テストで確認できる
2. **開発者として**、AstEngine に複数のルールと実績値を登録し、依存関係に従って全科目・全期間の値が正しく算出されることを確認できる
3. **開発者として**、循環依存が存在する場合にエラーが検出され、関与する科目がエラーメッセージに含まれることを確認できる

## 5. 受け入れ条件

### 5.1 FormulaNode 階層

- [ ] FormulaNode インターフェースが `nodeId`, `evaluate()`, `getDependencies()` を定義していること
- [ ] FormulaNodeRef インターフェースが `accountCode`, `period`, `resolve()` を定義していること
- [ ] ConstantNode が指定値をそのまま返すこと（依存なし）
- [ ] AddNode が全 operand の合計を返すこと
- [ ] SubtractNode が minuend - subtrahend を返すこと
- [ ] MultiplyNode が base × factor を返すこと
- [ ] ReferenceNode が参照先の値をそのまま返すこと
- [ ] NegateNode が符号反転した値を返すこと
- [ ] 各ノードの `evaluate()` が EvaluationCache を参照してメモ化すること

### 5.2 EvaluationCache

- [ ] nodeId をキーとして Money を保存・取得できること
- [ ] `has()` でキャッシュの存在判定ができること
- [ ] `clear()` でキャッシュを全消去できること

### 5.3 NodeRegistry

- [ ] FormulaNode を登録し、nodeId で取得できること
- [ ] `getOrCreate()` で既存ノードがあればそれを返し、なければファクトリで生成して登録すること
- [ ] `buildNodeId()` が AccountCode と Period からユニークな ID を生成すること

### 5.4 DependencyGraph

- [ ] NodeRegistry から依存グラフを構築できること
- [ ] Kahn のアルゴリズム（入次数ベース）でトポロジカルソートを提供すること
- [ ] 循環依存を検出し、関与する AccountCode の配列を返すこと

### 5.5 AstEngine

- [ ] `registerRules()` で全ルール × 全期間の FormulaNode を構築・登録できること
- [ ] 実績値が ConstantNode として登録されること
- [ ] `compute()` がトポロジカルソート順に全ノードを評価し、ComputationResult を返すこと
- [ ] `getValue()` で AccountCode と Period を指定して計算結果を取得できること
- [ ] 計算エラー（循環依存等）が ComputationResult.errors に含まれること

### 5.6 Rule 実装（7 種類）

- [ ] 全ルールが Rule インターフェースを実装していること
- [ ] ManualInputRule: 固定値の ConstantNode を返すこと
- [ ] GrowthRateRule: 前期値 × (1 + rate) の MultiplyNode を返すこと
- [ ] PercentageRule: 参照科目 × ratio の MultiplyNode を返すこと
- [ ] ReferenceRule: 参照先ノードの ReferenceNode を返すこと（期間オフセット対応）
- [ ] BalanceChangeRule: 前期残高 + 変動額の AddNode を返すこと
- [ ] SumRule: AccountHierarchy から子科目を取得し、全子科目の AddNode を返すこと
- [ ] SubtractRule: minuend - subtrahend の SubtractNode を返すこと

### 5.7 テスト

- [ ] 各 FormulaNode 具体クラスの `evaluate()` テスト（正常系）
- [ ] 各ルールの `buildFormulaNode()` が正しいノードツリーを返すことのテスト
- [ ] DependencyGraph のトポロジカルソートが正しい順序を返すことのテスト
- [ ] DependencyGraph の循環検出テスト
- [ ] AstEngine の統合テスト（3〜5 科目 × 2 期間の簡易モデルで計算結果を検証）
- [ ] 全テストがパスすること

### 5.8 パッケージ構造

- [ ] computation パッケージが account, period, money, rule を参照すること
- [ ] rule パッケージが account, period, money を参照すること
- [ ] 上記以外のパッケージ参照方向違反がないこと
- [ ] computation パッケージと rule パッケージに index.ts でエクスポートが定義されていること

## 6. 制約事項

- TypeScript strict モードで実装
- ドメイン層はフレームワーク非依存（Prisma, Hono, React 等に依存しない）
- 全値オブジェクトは不変（readonly + Object.freeze）
- コレクションは ReadonlyMap / readonly 配列で公開
- `docs/functional-design.md` セクション 4.5〜4.6 の型定義に準拠

---

*— End of Document —*
