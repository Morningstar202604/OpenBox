# OpenBox · オープンソース AI リソースナビ

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

**無料 AI リソースを、毎日チェック、ひとまとめに。**

11 カテゴリ・280 件以上の厳選リソース：無料モデル API、中継ゲートウェイ、チャットミラー、無料サーバーとドメイン、AI アプリ、開発ツール、学習素材。自動リンク巡回とコミュニティ投票の二段構えで鮮度を維持——無料枠が死んだら、登録して気づく前にカードに表示されます。

公開サイト：[openbox-nav-5ke.pages.dev](https://openbox-nav-5ke.pages.dev)

## なぜ作ったか

ネット上の「無料 AI リソースまとめ」は数週間で腐ります：リンク切れ、こっそりクレカ必須化、条件の未記載。OpenBox はこれを三つの仕組みで解決します。

1. **自動巡回**——毎日全リンクをプローブ（HTTP + DNS フォールバック、2 回連続失敗で死亡判定）。結果はサイトへ即反映。
2. **コミュニティ投票**——各カードに「まだ使える / 死んだ」投票。デバイス単位で重複排除され、巡回の合間もリストが新鮮に。
3. **条件の明記**——招待コード要否、地域制限、後からの課金まで、カードに明記。

## 収録内容

- **カテゴリ**：無料 API、チャットミラー、中継、プロキシノード、無料サーバー/VPS、無料ドメイン、AI アプリ、エージェント、オープンモデル、ツール、学習リソース、公益サイト、招待コード
- **シナリオフィルタ**：初心者向け、開発者、研究者、クリエイター、新入生キット
- 名称・概要・タグ・対応モデル横断の多言語検索
- グリッド/リスト表示、ダークモード、モバイル底部タブ
- Supabase バックエンド（任意）：投稿審査、コメント、評価、お気に入り同期。未設定でも全機能利用可
- PWA：インストール可能、初回訪問後はオフライン対応

## クイックスタート

```bash
git clone https://github.com/Morningstar202604/OpenBox.git
cd OpenBox
npm install --legacy-peer-deps
npm run dev        # http://localhost:5173/OpenBox/
npm run build      # tsc + vite ビルド + SPA パス生成
```

## デプロイ（すべて無料）

| 対象 | ガイド |
|---|---|
| 学校/キャンパス内網（推奨） | [DEPLOY-SCHOOL.md](./DEPLOY-SCHOOL.md) |
| 中国本土から到達可能な公開サイト | [EDGEONE_DEPLOY.md](./EDGEONE_DEPLOY.md)（Tencent EdgeOne Pages 無料版） |
| 海外ミラー | [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) |

`main` ブランチへの push で GitHub Actions が自動ビルド。Cloudflare の秘密鍵未設定時はデプロイ手順が自動スキップされ、エラーにはなりません。

## データ品質

- `npm run audit:data` — 7 項目の自動コンテンツ検査（自己矛盾・根拠のない価格表記・偽タグ・期限切れの数値）
- `npm run monitor` — 状態保持型の日次巡回エンジン、`resource-status.json` を生成
- `supabase/migrations/0001`–`0008` に行レベルセキュリティと匿名書き込みのレート制限を内蔵

## コントリビュート

コード不要で参加できます：リソース投稿、検証投票、コメントで体験共有、リンク切れ報告、翻訳改善。詳細は [CONTRIBUTING.md](./CONTRIBUTING.md)。コードは fork → branch → PR の標準フローで。

OpenBox が無料リソース探しの手間を省けたなら、Star を押して他の人にも見つけてもらいましょう。それだけのお願いです。

## ライセンス

[Apache-2.0](./LICENSE) © Morningstar202604
