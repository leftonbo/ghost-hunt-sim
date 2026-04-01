# ニンゲン逃走行動の改善

## 変更日: 2026-03-31

## 変更内容
1. **逃走中の分離力**: 逃走中も `applySeparation()` でニンゲン同士の分離力を適用。固まり防止のため通常時より強い `FLEE_SEPARATION = 0.08` を使用。
2. **逃走クールダウン**: `fleeTimer` を導入。おばけが視界から離れても `FLEE_COOLDOWN = 60` フレーム（約1秒）は逃走モードを継続。チャタリング防止。
3. **applySeparation メソッド抽出**: `applyFlocking()` から分離計算を `applySeparation(humans, dt, strength)` に抽出。逃走時・通常時で強度を変えて再利用。

## 定数
- `FLEE_SEPARATION = 0.08` (通常時の `FLOCK_SEPARATION = 0.05` の1.6倍)
- `FLEE_COOLDOWN = 60` (約1秒間逃走継続)

## 対象ファイル
- `src/core/constants.ts`
- `src/entities/Human.ts`
