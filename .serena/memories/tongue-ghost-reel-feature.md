# べろべろおばけ舌引き寄せ機能

## 概要
べろべろおばけが舌でニンゲンを掴んだ後、瞬時に捕食せず、舌でニンゲンを本体まで引き寄せてから捕食する。

## 変更点
- `TONGUE_REEL_SPEED` 定数追加（`TONGUE_EXTEND_SPEED * 0.7`）: 引き寄せ時の巻き取り速度
- `Human.grabbed` プロパティ追加: 舌に掴まれている状態フラグ。trueの間は移動処理スキップ
- `TongueGhost.retracting` 状態で `tongueGrabbedHuman` がいる場合:
  - 巻き戻し速度を `TONGUE_REEL_SPEED` に変更（通常より遅い）
  - 掴んだニンゲンの座標を舌先に追従させる
  - 他のおばけに先に捕食された場合は `grabbed` 解除してリセット
- `startFeeding()` で `human.grabbed = false` をクリア
- `stunExternal()` で掴んだニンゲンの `grabbed` を解除してからリセット
