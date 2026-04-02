# おばけ種類システム

## 概要
Ghost基底クラスを継承した4種類のおばけ（ノーマル、フェラル、すいこみ、べろべろ）が実装済み。
ファクトリパターンとGhostMode/GhostTypeで種類選択を管理。

## 複数捕食システム
- 全おばけが `capturedHumans: Human[]` で複数ニンゲンを同時捕食可能
- `convertedHumans: Human[]` に生気0になったニンゲンを蓄積、Simulationが新おばけを生成
- 2人目以降の吸収効率は `MULTI_CAPTURE_DRAIN_MULTIPLIER`(0.7) で減衰
- `getHealthDrainRate(index)` メソッドでインデックスに応じた吸収速度を返す（サブクラスでオーバーライド可能）
- 消化中(digesting)でも追加捕食可能（canCapture が hunting | digesting を返す）
- 最後の1人が脱出した場合のみスタン、全員消化完了なら即hunting復帰
- ランタンスタン(stunExternal)で全capturedHumansを吐き出し
- `releasing` 状態は廃止済み（GhostStateは hunting | digesting | stunned の3状態）

## 重要な設計パターン
- Ghost基底クラスのオーバーライド可能メソッド: `updateHunting`, `updateDigesting`, `updateStunned`, `drawBody`, `drawFace`, `canCapture`, `checkCapture`, `isInRange`, `startFeeding`, `finishDigestion`, `stunExternal`, `getHealthDrainRate`, `releaseHumanFromBody`
- `escapedHumans: Human[]` 配列で脱出ニンゲンをSimulationに通知
- `ghost-factory.ts` の `createGhost()` と `pickGhostType()` で種類生成
- SimulationはcanCapture()でキャプチャ可否を判定、ghost.stateを直接チェックしない

## 各おばけの特殊捕食挙動
- **FeralGhost**: ダッシュ中は捕食してもダッシュ継続（startFeedingオーバーライド）、ダッシュ終了時にcapturedHumansがいればdigesting遷移
- **SuctionGhost**: 吸引中はsuctionCapturedHumansに一時格納、吸引終了時にcapturedHumansに移動。getHealthDrainRateでSUCTION_DRAIN_MULTIPLIERも適用
- **TongueGhost**: tongueGrabbedHumans[]で舌に掴んだ複数ニンゲンを管理、引き寄せ完了でcapturedHumansへ

## 新おばけ種類の追加手順
1. GhostType に追加 (types.ts)
2. 定数を追加 (constants.ts)
3. Ghost継承サブクラス作成 (entities/)
4. ghost-factory.ts に追加
5. GhostMode に固定モード追加 (types.ts)
6. index.html の select-ghost-mode に option 追加
