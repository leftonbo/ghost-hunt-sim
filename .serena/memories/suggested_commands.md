# 開発コマンド一覧

## 基本コマンド
- `npm run dev` — 開発サーバー起動（HMR対応）
- `npm run build` — プロダクションビルド（tsc --noEmit && vite build → dist/に出力）
- `npm run preview` — ビルド結果のプレビュー
- `npm run lint` — ESLint による静的解析（eslint src/）
- `npm run format` — Prettier によるコード整形（prettier --write src/）

## タスク完了時に実行すべきコマンド
1. `npm run lint` — リントエラーがないことを確認
2. `npm run build` — ビルドが通ることを確認

## システムコマンド
- git, ls, cd, grep, find — 標準Linuxコマンド利用可能
