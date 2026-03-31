# 👻 おばけ捕食シミュレーター

画面上の「おばけ👻」が「ニンゲン🧑」を追いかけて丸呑みにするシミュレーターです。  
食べられたニンゲンはおばけの体内で消化され、新たなおばけとして飛び出します。  
最終的に全員おばけになったらシミュレーション終了！

> かわいげのあるホラーがテーマ。怖いけどどこか楽しい雰囲気を大切にしています。

## 🎮 遊び方

1. `npm install` で依存パッケージをインストール
2. `npm run dev` で開発サーバーを起動
3. ブラウザで `http://localhost:5173/` を開く
4. 操作パネルでおばけ数・ニンゲン数・速度を調整
5. 「▶ 開始」ボタンを押す
6. おばけがニンゲンを追いかける様子を眺める
7. 全ニンゲンがおばけになったらクリア！

## 🕹️ 操作

| 操作 | 説明 |
|------|------|
| ▶ 開始 | シミュレーションを開始 |
| ⏸ 一時停止 | 一時停止 / 再開のトグル |
| 🔄 リセット | 初期状態に戻す |
| 初期おばけ数 | 1〜10（デフォルト: 1） |
| 初期ニンゲン数 | 5〜100（デフォルト: 30） |
| 速度 | 0.5x〜3.0x（デフォルト: 1.0x） |

## 📋 情報表示

- 現在のおばけ数 / ニンゲン数
- 消化中のおばけ数
- 経過時間（mm:ss）
- 終了時メッセージ

## 🔧 技術仕様

- **ビルドツール**: Vite 8
- **言語**: TypeScript（strict モード）
- **スタイル**: CSS Modules
- **リンター**: ESLint + Prettier
- 外部ライブラリ不使用（Canvas API のみ）
- `requestAnimationFrame` ベースの 60fps ゲームループ
- update → draw の分離構造
- レスポンシブ対応（ウィンドウリサイズに追従）

## 🛠️ 開発コマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動（HMR 対応） |
| `npm run build` | プロダクションビルド（`dist/` に出力） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint による静的解析 |
| `npm run format` | Prettier によるコード整形 |

## 🏗️ ファイル構成

```
ghost-hunt-sim/
├── index.html                 # Vite エントリ HTML
├── src/
│   ├── main.ts                # エントリポイント
│   ├── style.module.css       # CSS Modules スタイル
│   ├── vite-env.d.ts          # 型定義
│   ├── core/
│   │   ├── types.ts           # 型定義
│   │   ├── constants.ts       # ゲーム定数
│   │   └── utils.ts           # ユーティリティ関数
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
├── AGENTS.md
├── project.yml
├── .gitignore
├── .gitattributes
└── .editorconfig
```

## 📜 ライセンス

MIT
