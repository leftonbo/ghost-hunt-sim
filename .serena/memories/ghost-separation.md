# おばけ分離力の実装

## 概要
おばけが複数いると同じ場所に固まって追跡する問題を、Boids風の分離力（Separation）で解決。

## 変更内容
- `src/core/constants.ts`: `GHOST_SEPARATION_RADIUS = 60`, `GHOST_SEPARATION_STRENGTH = 0.08` を追加
- `src/entities/Ghost.ts`: `update()` に `ghosts: Ghost[]` パラメータ追加、`applySeparation()` メソッド追加。hunting ステートで分離力を適用
- `src/entities/Simulation.ts`: `ghost.update()` 呼び出しに `this.ghosts` を追加

## 分離アルゴリズム
- `GHOST_SEPARATION_RADIUS`（60px）以内の他のおばけから反発ベクトルを算出
- `(this - other) / distance` で距離に反比例する反発力
- `GHOST_SEPARATION_STRENGTH * dt` で加速度として適用
- ニンゲンの `Human.applySeparation()` と同じパターン
