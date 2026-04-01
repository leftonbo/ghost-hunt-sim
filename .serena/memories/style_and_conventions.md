# コーディング規約・スタイルガイド

## 命名規則
- 変数名・関数名・クラス名は英語で、意味の分かる命名
- ドキュメント・UIテキスト・コメントは日本語

## フォーマット
- インデント: スペース2つ
- 文字コード: UTF-8、改行: LF
- Prettier設定: セミコロンなし、シングルクォート、末尾カンマ(all)、1行100文字

## コード規約
- 外部ライブラリは使用しない（Canvas API のみ）
- マジックナンバーは `src/core/constants.ts` にまとめる
- 型定義は `src/core/types.ts` にまとめる
- 循環参照回避のため `import type` を使用する
- TypeScript strict モード有効

## CSS
- CSS Modules（*.module.css）を使用
- グローバルスタイルは `:global()` で囲む
- ダークテーマ（暗い紫〜深青）

## ESLint
- flat config形式（eslint.config.js）
- eslint recommended + typescript-eslint recommended + prettier
- dist/ は除外
