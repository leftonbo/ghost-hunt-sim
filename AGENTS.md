# AGENTS.md — AIエージェント向けドキュメント

このファイルは、AIコーディングエージェントがこのプロジェクトを理解・拡張するための技術ドキュメントです。

## プロジェクト概要

「おばけ捕食シミュレーター」— ブラウザで動くシミュレーションゲーム。  
おばけ（👻）がニンゲン（🧑）を追いかけて捕食し、消化後に新たなおばけとして変換する。  
全ニンゲンがおばけになったらシミュレーション終了。

## 技術スタック

- **ビルドツール**: Vite 8
- **言語**: TypeScript（strict モード）
- **スタイル**: CSS Modules（`*.module.css`）
- **リンター**: ESLint（flat config） + Prettier
- **パッケージ管理**: npm
- **描画**: Canvas 2D API（外部ライブラリ不使用）

## 開発コマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動（HMR 対応） |
| `npm run build` | プロダクションビルド（`dist/` に出力） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint による静的解析 |
| `npm run format` | Prettier によるコード整形 |

## ファイル構成

```
ghost-hunt-sim/
├── index.html                 # Vite エントリ HTML（DOM 構造のみ）
├── src/
│   ├── main.ts                # エントリポイント（DOM 取得、イベント設定、Simulation 起動）
│   ├── style.module.css       # CSS Modules スタイル
│   ├── vite-env.d.ts          # Vite / CSS Modules 型定義
│   ├── core/
│   │   ├── types.ts           # 型定義（GhostState, ParticleType, SimulationState, Position, UIElements）
│   │   ├── constants.ts       # ゲーム定数（速度、サイズ、色、距離など）
│   │   └── utils.ts           # ユーティリティ関数（rand, dist, clamp, normalize, formatTime 等）
│   └── entities/
│       ├── Ghost.ts           # おばけクラス
│       ├── Human.ts           # ニンゲンクラス
│       ├── Particle.ts        # パーティクルエフェクトクラス
│       └── Simulation.ts      # シミュレーション管理クラス
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── .prettierrc
├── README.md
├── AGENTS.md                  # このファイル
├── project.yml                # Serena MCP プロジェクト設定
├── .gitignore
├── .gitattributes
└── .editorconfig
```

## コーディング規約

- 変数名・関数名・クラス名は英語で、意味の分かる命名をする
- ドキュメント・UIテキスト・コメントは日本語
- インデント: スペース2つ
- 文字コード: UTF-8、改行: LF
- Prettier 設定: セミコロンなし、シングルクォート、末尾カンマ、1行100文字
- 外部ライブラリは使用しない（Canvas API のみ）
- マジックナンバーは `src/core/constants.ts` にまとめる
- 型定義は `src/core/types.ts` にまとめる
- 循環参照回避のため `import type` を使用する

## アーキテクチャ

### エントリポイント（`src/main.ts`）

- CSS Modules のインポートとクラス名の DOM 適用
- DOM 要素取得 → `UIElements` オブジェクト構築 → `Simulation` インスタンス生成
- ボタン・スライダー・リサイズのイベントリスナー設定

### スタイル（CSS Modules）

- `src/style.module.css` にクラスベースのスタイルを記述
- グローバルスタイル（body, button, input[type="range"] 等）は `:global()` で囲む
- ダークテーマ（暗い紫〜深青）
- レスポンシブ対応（Canvas が画面サイズにフィット）

### ゲームループ

- `requestAnimationFrame` ベース、`update()` → `drawFrame()` 分離構造
- `Simulation` クラスが全体を管理

### クラス構成

| クラス | ファイル | 責務 |
|--------|----------|------|
| `Ghost` | `src/entities/Ghost.ts` | おばけエンティティ。状態管理（hunting/digesting/releasing）、最寄りニンゲン追跡、捕食、消化タイマー、描画 |
| `Human` | `src/entities/Human.ts` | ニンゲンエンティティ。逃走行動、ランダム移動、簡易Boids群れ行動、壁反射、描画 |
| `Particle` | `src/entities/Particle.ts` | パーティクルエフェクト。霧/フラッシュ/星/ポップの4タイプ、ライフ管理 |
| `Simulation` | `src/entities/Simulation.ts` | メインシミュレーション管理。エンティティ生成/更新/描画、捕食判定、終了判定、UI連携 |

#### エンティティの状態遷移（Ghost）

```
hunting → [ニンゲンに接触] → digesting → [消化タイマー完了] → releasing → hunting
```

- `hunting`: 最寄りニンゲンを追跡（sin波で横揺れしながら移動）
- `digesting`: 移動停止、体が膨張、内部にニンゲンのシルエット表示、消化タイマー減算
- `releasing`: 新おばけを生成して飛び出させる、自身は通常サイズに戻る

#### 行動アルゴリズム

**おばけの追跡**:

- 全ニンゲンから最寄りを探索（全探索 O(n²)）
- 最寄りニンゲンへの方向ベクトルを算出し、速度を適用
- sin波で横方向にゆらぎを加える

**ニンゲンの逃走**:

- 視界半径内のおばけを検知
- 検知した全おばけの反対方向の合成ベクトルで逃走
- 視界外: ランダム方向にうろうろ + 群れ行動

**群れ行動（簡易Boids）**:

- Cohesion（集合）: 近傍ニンゲンの重心に向かう力
- Separation（分離）: 近すぎるニンゲンから離れる力
- おばけ接近時は群れ行動無視で逃走優先

## 拡張ポイント

### 定数の調整

`src/core/constants.ts` の定数を変更するだけで以下を調整可能:

- 速度バランス（`GHOST_BASE_SPEED`, `HUMAN_BASE_SPEED`）
- 捕食距離（`CAPTURE_DISTANCE`）
- 消化時間（`DIGESTION_TIME_MIN/MAX`）
- 視界半径（`HUMAN_VISION_RADIUS`）
- 群れ行動の強度（`FLOCK_COHESION`, `FLOCK_SEPARATION`）

### 新エンティティの追加

`Ghost` / `Human` クラスと同様の `update()` + `draw()` インターフェースを持つクラスを作成し、`Simulation` の `update()` / `draw()` に組み込む。

### 新エフェクトの追加

`Particle` クラスに新しい `type` を追加し、`draw()` メソッド内に描画ロジックを追加する。

---

## 将来の拡張候補（Todo）

以下は将来の実装候補としてアイデアを記録したもの。現時点では未実装。

### 1. 勇者ニンゲン

- ニンゲンの中にランダムで勇者が混ざる
- 青い炎のランタンを持ち、おばけを一時的に気絶（stunned 状態）させる
- 気絶中のおばけは一定時間動けない
- 勇者は通常のニンゲンより逃走速度が速い

### 2. おばけ合体

- 一定距離内のおばけ同士が合体して巨大おばけになる
- 巨大おばけは速度が上がり、捕食範囲が広がる
- 巨大おばけが捕食すると一度に複数のおばけを生成する

### 3. 生気スコア

- 各ニンゲンに「生気」パラメータを設定
- 生気が高いニンゲンは見た目が明るく光る
- おばけは生気が高いニンゲンを優先的に狙う
- 生気が高いニンゲンを捕食すると消化が速い

### 4. 満腹休憩

- おばけが連続して捕食すると「満腹」状態になる
- 満腹状態では一定時間追跡しない（その場で浮遊）
- 満腹中はおばけの見た目が少し大きく、満足そうな表情になる

## 補足

- プロジェクトの拡張にあわせて AGENTS.md や README.md も更新してください
- Serena MCP から現状の把握やメモリの更新を行ってください
