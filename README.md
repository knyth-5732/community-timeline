# Community Timeline

一本の時間軸に、コミュニティのメンバーや参加者が出来事をピンとして追加するWebアプリです。

## アクセス設計

- 年表の閲覧：招待済みメンバーのログイン必須
- 投稿：専用URLを知っている人ならアカウント登録なしで可能
- 投稿用URLから年表データを読むことはできません
- 投稿は Edge Function 経由で保存し、ブラウザーに service_role key を置きません

## 1. Supabaseプロジェクト

1. https://supabase.com で無料プロジェクトを作成
2. SQL Editorで `supabase/migrations/001_init.sql` を実行
3. Project Settings → API から Project URL と publishable/anon key を取得
4. Authentication → Providers → Email を有効にする
5. Authenticationのサインアップを無効化し、メンバーは管理者が招待する
6. Authentication → URL Configuration にGitHub PagesのURLを追加

無料プランは現在、DB 500MB、ファイルストレージ1GB、月間アクティブユーザー50,000等の枠があります。無料プロジェクトは1週間非アクティブだと一時停止される場合があります。最新条件はSupabase公式料金表を確認してください。

## 2. フロントエンド設定

1. `config.example.js` を `config.js` にコピー
2. `config.js` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` を設定
3. GitHub Pagesでこのリポジトリを公開する

`config.js` は公開キーのみを含めます。service_role keyを絶対に書かないでください。

## 3. 投稿用Edge Function

Supabase CLIを使える環境でプロジェクトをリンクし、関数をデプロイします。

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
TOKEN="$(openssl rand -hex 32)"
echo "$TOKEN"  # この値を投稿リンクに使うので控える
supabase secrets set SUBMISSION_TOKEN="$TOKEN"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase functions deploy submit-event
```

Supabase URLは通常、プロジェクトの標準環境変数として利用できます。必要に応じてDashboardのEdge Function secretsで確認してください。

投稿リンクは次の形式です。

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/#post=YOUR_SUBMISSION_TOKEN
```

`YOUR_SUBMISSION_TOKEN` は `SUBMISSION_TOKEN` に設定した値と同じものにします。URLは投稿者にだけ共有してください。漏えいした場合はトークンを再発行してください。

## 4. メンバーを招待

Supabase Dashboard → Authentication → Users からメンバーのメールアドレスを招待します。招待済みアドレスだけがログインできる設定にしてください。

## 5. 注意事項（MVP）

- 現段階では投稿リンクを知る人は投稿を何度でも送信できます。公開前に必要ならCloudflare Turnstileやレート制限を追加してください。
- 投稿内容の編集・削除UIは未実装です。初期運用ではSupabase Dashboardから管理できます。
- GitHub Pagesのリポジトリは公開されます。秘密情報や投稿トークンをコードにコミットしないでください。
- Supabase Freeは無料枠内で使えますが、無料枠超過や仕様変更には注意してください。
