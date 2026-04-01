# ghost-hunt-sim プロジェクト概要

## 目的
「おばけ捕食シミュレーター」— ブラウザで動くシミュレーションゲーム。
おばけ（👻）がニンゲン（🧑）を追いかけて捕食し、消化後に新たなおばけとして変換する。
全ニンゲンがおばけになったらシミュレーション終了。

## 技術スタック
- ビルドツール: Vite 8
- 言語: TypeScript 6（strict モード）
- スタイル: CSS Modules（*.module.css）
- リンター: ESLint 10（flat config） + eslint-config-prettier
- フォーマッター: Prettier
- パッケージ管理: npm
- 描画: Canvas 2D API（外部ライブラリ不使用）
- ターゲット: ES2020, モジュール: ESNext

## コードベース構造
- src/main.ts — エントリポイント（DOM取得、イベント設定、Simulation起動）
- src/style.module.css — CSS Modules スタイル
- src/core/types.ts — 型定義（GhostState, ParticleType, SimulationState, Position, UIElements）
- src/core/constants.ts — ゲーム定数（速度、サイズ、色、距離など 23個）
- src/core/utils.ts — ユーティリティ関数（rand, dist, clamp, normalize, formatTime等）
- src/entities/Ghost.ts — おばけクラス（hunting/digesting/releasing状態管理）
- src/entities/Human.ts — ニンゲンクラス（逃走、群れ行動）
- src/entities/Particle.ts — パーティクルエフェクト（霧/フラッシュ/星/ポップ）
- src/entities/Simulation.ts — シミュレーション管理（ゲームループ、エンティティ管理、UI連携）

## キークラス: Simulation
- プロパティ: canvas, ctx, ghosts, humans, particles, state, speedMultiplier, elapsedTime等
- メソッド: constructor, resize, init, start, pause, reset, loop, update, loopFinished, drawFrame, updateUI
- requestAnimationFrameベースのゲームループ（update → drawFrame分離）
