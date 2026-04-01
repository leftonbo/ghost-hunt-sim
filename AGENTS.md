# AGENTS.md — AIエージェント向けドキュメント

このファイルは、AIコーディングエージェントがこのプロジェクトを理解・拡張するための技術ドキュメントです。

## プロジェクト概要

ブラウザで動くシミュレーションゲーム。  
おばけ（👻）がニンゲン（🧑）を追いかけて捕食し、体内で新たなおばけとして変換する。  
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
| ---------- | ------ |
| `npm run dev` | 開発サーバー起動（HMR 対応） |
| `npm run build` | プロダクションビルド（`dist/` に出力） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint による静的解析 |
| `npm run format` | Prettier によるコード整形 |

## ファイル構成

```text
ghost-hunt-sim/
├── index.html                 # Vite エントリ HTML（DOM 構造のみ）
├── src/
│   ├── main.ts                # エントリポイント（DOM 取得、イベント設定、Simulation 起動）
│   ├── style.module.css       # CSS Modules スタイル
│   ├── vite-env.d.ts          # Vite / CSS Modules 型定義
│   ├── core/
│   │   ├── types.ts           # 型定義（GhostState, GhostType, GhostMode, ParticleType, SimulationState, Position, UIElements）
│   │   ├── constants.ts       # ゲーム定数（速度、サイズ、色、距離、各種おばけパラメータなど）
│   │   └── utils.ts           # ユーティリティ関数（rand, dist, clamp, normalize, angleDiff, formatTime 等）
│   └── entities/
│       ├── Ghost.ts           # おばけ基底クラス（ノーマルおばけ）
│       ├── FeralGhost.ts      # フェラルおばけ（ダッシュ捕食型）
│       ├── SuctionGhost.ts    # すいこみおばけ（コーン吸引型）
│       ├── TongueGhost.ts     # べろべろおばけ（舌射出型）
│       ├── ghost-factory.ts   # おばけファクトリ関数（種類生成・モード判定）
│       ├── Human.ts           # ニンゲンクラス
│       ├── Lantern.ts         # ランタンアイテムクラス
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
- 追加・更新するクラスにはクラスJSDocを付与し、公開メソッドには必ずJSDoc（概要と主要@param）を付与する

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
| ------ | -------- | ---- |
| `Ghost` | `src/entities/Ghost.ts` | おばけ基底クラス（ノーマル）。状態管理（hunting/digesting/releasing/stunned）、最寄りニンゲン追跡、捕食・生気吸収、もがき判定、外部スタン（ランタン等）、描画。サブクラスがオーバーライド可能なupdateHunting/updateDigesting/updateStunned/drawBody/drawFace等のメソッドを持つ |
| `FeralGhost` | `src/entities/FeralGhost.ts` | フェラルおばけ。ダッシュ（クールダウン付き）でのみ捕食可能。赤系、スパイク付き外見。ダッシュ以外では捕まえられない |
| `SuctionGhost` | `src/entities/SuctionGhost.ts` | すいこみおばけ。コーン状範囲のニンゲン吸引、複数同時捕食可能、消化速度低下。紫系、横広体型。移動速度やや遅い |
| `TongueGhost` | `src/entities/TongueGhost.ts` | べろべろおばけ。遠距離から舌を伸ばしてホーミング捕食。舌で掴んだニンゲンを本体まで引き寄せてから捕食。舌にもランタン判定あり。緑系、螺旋瞳。移動速度遅い |
| `ghost-factory` | `src/entities/ghost-factory.ts` | createGhost（種類指定生成）とpickGhostType（モード別種類選択）を提供 |
| `Human` | `src/entities/Human.ts` | ニンゲンエンティティ。生気・スタミナ管理、逃走行動、疲労状態、もがき（捕食中）、舌による引き寄せ（grabbed状態）、ランタン所持・ドロップ、ランダム移動、簡易Boids群れ行動、壁反射、描画 |
| `Lantern` | `src/entities/Lantern.ts` | ランタンアイテム。地面配置・ニンゲン所持、おばけ接近時の自動発動（範囲スタン）、クールダウン管理、描画 |
| `Particle` | `src/entities/Particle.ts` | パーティクルエフェクト。霧/フラッシュ/星/ポップ/ランタンの5タイプ、ライフ管理 |
| `Simulation` | `src/entities/Simulation.ts` | メインシミュレーション管理。エンティティ生成/更新/描画、捕食判定（canCapture/checkCapture）、ランタン管理（拾得・発動・ドロップ、isInRange判定）、おばけモード管理、ゴーストファクトリ連携、終了判定、UI連携 |

#### エンティティの状態遷移（Ghost）

```text
hunting → [ニンゲンに接触] → digesting → [生気0] → releasing → hunting
                                  ↓
                          [脱出成功] → stunned → [スタンタイマー完了] → hunting
                                  ↓
                    [ランタン発動（外部スタン）] → stunned（ニンゲン吐き出し）→ hunting
```

- `hunting`: 最寄りニンゲンを追跡（sin波で横揺れしながら移動）
- `digesting`: ゆっくり浮遊、体が膨張、生気を吸収、内部のニンゲンがもがく（シルエット揺れ）
  - 生気が0になるとニンゲンが力尽き `releasing` に遷移
  - ニンゲンの脱出進捗が閾値に達すると `stunned` に遷移（ニンゲンが解放される）
  - ランタン等の外部スタンで `stunned` に遷移（消化中のニンゲンを吐き出す）
- `releasing`: 新おばけを生成して飛び出させる、自身は通常サイズに戻り `hunting` に
- `stunned`: 脱出されて一定時間動けない（点滅表示）、タイマー完了で `hunting` に復帰

#### ニンゲンのステータス

- **生気（health）**: 初期値 `MAX_HEALTH`。おばけの体内で吸収される。0で力尽きおばけ化。
- **スタミナ（stamina）**: 初期値 `MAX_STAMINA`。逃走中に消費、非逃走中に回復。
  - 実効最大値 = `MAX_STAMINA × (health / MAX_HEALTH)`（生気低下で上限減少）
  - 0になると疲労状態（`isFatigued`）: 速度が `FATIGUE_SPEED_MULTIPLIER` 倍に低下
  - 疲労は実効最大値まで回復しきるまで継続
- **もがき（escapeProgress）**: 捕食中にスタミナを消費して蓄積。`ESCAPE_THRESHOLD` 到達で脱出成功。
  - スタミナ0の間はもがけず進捗停止。

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
- 生気吸収速度（`HEALTH_DRAIN_RATE`）
- スタミナ消費/回復（`STAMINA_DRAIN_RATE`, `STAMINA_RECOVERY_RATE`）
- 疲労時速度倍率（`FATIGUE_SPEED_MULTIPLIER`）
- もがきパラメータ（`STRUGGLE_STAMINA_COST`, `ESCAPE_PROGRESS_RATE`, `ESCAPE_THRESHOLD`）
- スタン時間（`STUN_DURATION`）
- 視界半径（`HUMAN_VISION_RADIUS`）
- 群れ行動の強度（`FLOCK_COHESION`, `FLOCK_SEPARATION`）
- ランタン配置数（`DEFAULT_LANTERN_COUNT`）
- ランタン拾得距離（`LANTERN_PICKUP_DISTANCE`）
- ランタン発動距離（`LANTERN_ACTIVATION_DISTANCE`）
- ランタンスタン範囲（`LANTERN_STUN_RADIUS`）
- ランタンクールダウン（`LANTERN_COOLDOWN`）
- ランタン初期所持率（`LANTERN_INITIAL_CARRY_RATIO`）
- フェラルダッシュ（`FERAL_DASH_SPEED`, `FERAL_DASH_DURATION`, `FERAL_DASH_COOLDOWN`, `FERAL_DASH_RANGE`）
- すいこみ（`SUCTION_RANGE`, `SUCTION_CONE_HALF_ANGLE`, `SUCTION_PULL_STRENGTH`, `SUCTION_DURATION`, `SUCTION_COOLDOWN`, `SUCTION_DRAIN_MULTIPLIER`）
- べろべろ（`TONGUE_RANGE`, `TONGUE_EXTEND_SPEED`, `TONGUE_HOMING_STRENGTH`, `TONGUE_COOLDOWN`, `TONGUE_TIP_CAPTURE_DIST`, `TONGUE_REEL_SPEED`）
- モード出現確率（`RANDOM_MODE_SPECIAL_CHANCE`, `HARD_MODE_SPECIAL_CHANCE`）

### 新エンティティの追加

`Ghost` / `Human` クラスと同様の `update()` + `draw()` インターフェースを持つクラスを作成し、`Simulation` の `update()` / `draw()` に組み込む。

### 新おばけ種類の追加

1. `GhostType` に新しい種類を追加（`src/core/types.ts`）
2. 種類固有の定数を `src/core/constants.ts` に追加
3. `Ghost` を継承したサブクラスを `src/entities/` に作成（`updateHunting`, `drawBody`, `drawFace` 等をオーバーライド）
4. `src/entities/ghost-factory.ts` の `createGhost` と `pickGhostType` に新種類を追加
5. `GhostMode` に固定モードを追加（`src/core/types.ts`）
6. `index.html` の `select-ghost-mode` に `<option>` を追加

### 新エフェクトの追加

`Particle` クラスに新しい `type` を追加し、`draw()` メソッド内に描画ロジックを追加する。

---

## 補足

- プロジェクトの拡張にあわせて AGENTS.md や README.md も更新してください
- Serena MCP から現状の把握やメモリの更新を行ってください
- タスク完了後は Serena MCP にメモリの更新を行い、 git コミットを行ってください。

## git コミットメッセージ規則

コミットメッセージは日本語で記述してください。コミットメッセージの形式は以下の通りです。

```text
<intention> [scope?][:?] <message>
```

- intention: gitmoji リストから選択した絵文字。
- scope: 変更範囲を示すオプションの文字列。
- message: 変更内容の要約。

### gitmoji 一覧

- 🎉: プロジェクト立ち上げ時 (first commit)
- ✨️: 新機能追加
- 🐛: バグ修正
- 🩹: 軽微なバグ修正
- ♻️: リファクタリング
- ⚡️: パフォーマンス改善
- 🔥: 不要なコード・ファイルの削除
- 🔨: エディタツールの変更
- 🔧: パラメーター・設定ファイルの修正
- 💡: コメントの追加・修正
- ✏️: typo 修正
- 🔊: ログの追加・修正
- 🔇: ログの削除
- 🙈: gitignore の変更
- 🚚: ファイル・フォルダの移動・リネーム
- 🗃️: データベースの変更
- 🍱: 画像・音声などアセットファイルの変更
- ➕️: 依存関係の追加
- ➖️: 依存関係の削除
- ⬆️: 依存関係のアップデート
- ⬇️: 依存関係のダウンデート
- ✅️: テストコードの追加・更新・修正
- 🚧: 作業途中
- ⚗️: 実験的コード
- 🔀: マージコミット (merge)
- ⏪️: 元に戻す (revert)

### 例

```text
✨️ traveler-world: トラベラー世界観メモを追加
```

```text
🔧 ai-roguelite: おばけ世界の主人公の初期パラメーターを調整
```

```text
♻️ eel-rpg-game: キャラクター能力値計算ロジックをリファクタリング
```

### 注意事項

- **コミット粒度**: 変更内容ごとにコミットを分け、1コミット1目的を心がける。
- **メッセージの明確化**: 変更内容が一目でわかるように具体的に記述する。
- **一貫性の維持**: 既存のコミットメッセージスタイルと一貫性を保つ。
