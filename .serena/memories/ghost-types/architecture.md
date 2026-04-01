# おばけ種類システム

## 概要
Ghost基底クラスを継承した4種類のおばけ（ノーマル、フェラル、すいこみ、べろべろ）が実装済み。
ファクトリパターンとGhostMode/GhostTypeで種類選択を管理。

## 重要な設計パターン
- Ghost基底クラスのオーバーライド可能メソッド: `updateHunting`, `updateDigesting`, `updateStunned`, `drawBody`, `drawFace`, `canCapture`, `checkCapture`, `isInRange`, `startFeeding`, `finishDigestion`, `handleEscape`, `stunExternal`
- `escapedHumans: Human[]` 配列で複数ニンゲン解放をサポート（SuctionGhost用）
- `ghost-factory.ts` の `createGhost()` と `pickGhostType()` で種類生成
- SimulationはcanCapture()でキャプチャ可否を判定、ghost.stateを直接チェックしない

## 新おばけ種類の追加手順
1. GhostType に追加 (types.ts)
2. 定数を追加 (constants.ts)
3. Ghost継承サブクラス作成 (entities/)
4. ghost-factory.ts に追加
5. GhostMode に固定モード追加 (types.ts)
6. index.html の select-ghost-mode に option 追加
