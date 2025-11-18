# Club Key Manager Bot
これは、Discord上で部室の鍵の状態を管理するためのBotです。
ボタン操作による直感的な鍵の貸し借り、返却忘れを防ぐためのリマインダー機能、そして毎日決まった時間に鍵の状態をチェックする定時チェック機能を備えています。
ボイスチャンネルを使用せず、テキストチャンネルのみで完結するのが特徴です。

## 主な機能
- **直感的なボタン操作**: 「借りる」「開ける」「閉める」「返す」といった操作をボタン一つで実行できます。
- **リマインダー機能**: 鍵を借りてから一定時間が経過すると、返却を促すリマインダーを自動で送信します。
- **定時チェック機能**: 毎日指定された時刻に鍵が返却されているかを確認し、未返却の場合は管理者に通知します。
- **柔軟な設定**: スラッシュコマンドを使って、リマインダーの間隔や定時チェックの時刻を簡単に変更できます。

## 使い方

### セットアップ
1. GitHubからクローン：
   ```bash
   git clone <リポジトリURL>
   cd Club-Key-Manager-Bot2
   ```

2. 設定ファイルを作成：
   ```bash
   cp src/settings.json.sample src/settings.json
   ```
   `src/settings.json` を編集して、Discord Bot Token などを設定してください。

3. docker-compose で起動：
   ```bash
   docker compose up -d --build
   ```
   初回起動時やコードを更新した際は、`--build` フラグを付けてイメージを再ビルドしてください。

4. ログ確認：
   ```bash
   docker compose logs -f
   ```
   "Ready!" と表示されたら起動完了です。

### 停止・再起動
```bash
# 停止
docker compose down

# 再起動
docker compose restart
```
   
## 設定ファイル
`src/settings.json` に以下を指定します：
- **LogChannel** : Discord のログチャンネル ID
- **Token** : Discord Bot トークン（**秘密厳守**）
- **ModeConsole** : `"true"` または `"false"`。`false` は部室鍵用、`true` は操作卓用
- **ReminderTimeMinutes** : リマインダー間隔（分）。デフォルト：180分
- **checkHour** : 定時チェック時刻（時）。デフォルト：20
- **checkMinute** : 定時チェック時刻（分）。デフォルト：0

## 機能

### ボタン操作
- 鍵の状態管理（借りる → 開ける → 閉める → 返す）
- 現在の鍵状態に応じたボタンのみ表示
- リマインダーと定時チェックメッセージにもボタンを追加

### リマインダー機能
- 鍵を借りたユーザーに指定時間後に返却リマインダーを送信
- リマインダーメッセージから直接鍵操作可能
- リマインダーは設定間隔で繰り返し送信

### 定時チェック
- 毎日指定時刻に鍵が返却されているかチェック
- 未返却の場合、ユーザーにメンション付きで通知

### スラッシュコマンド

#### 鍵操作
- `/borrow [delay-minutes]` : 鍵を借ります。オプションでリマインダーを開始するまでの時間を分単位で指定できます。
  - `delay-minutes` を指定しない場合、デフォルト設定の間隔でリマインダーが開始されます。
  - 既に鍵を借りている状態で実行すると、リマインダーの開始時間を更新できます。

#### リマインダー設定
- `/reminder` : リマインダー機能のON/OFFを切り替えます。
- `/reminder-time <minutes>` : リマインダーを送信する間隔を分単位で設定します。（例: `/reminder-time 180`）

#### 定時チェック設定
- `/scheduled-check` : 定時チェック機能のON/OFFを切り替えます。
- `/check-time <hour> <minute>` : 定時チェックを実行する時刻を設定します。（例: `/check-time 22 30`）

#### その他
- `/status` : 現在のリマインダーと定時チェックの設定内容を表示します。
- `/owner <user>` : 鍵の所有者を指定したユーザーに変更します。

### アクセントカラーの意味
- Colors.Blue	#3498DB	情報 (Info)
- Colors.Green	#57F287	成功 (Success)
- Colors.Gold	#F1C40F	警告・強調 (Warning)
- Colors.Red	#ED4245	エラー (Error)

## ファイル構成

```
src/
├── config.ts              # 設定管理
├── types.ts               # 型定義
├── utils.ts               # ユーティリティ関数
├── main.ts                # エントリーポイント
├── discord/               # Discord関連
│   ├── client.ts          # Discordクライアント初期化
│   ├── commands.ts        # コマンド定義
│   └── discordUI.ts       # UI要素（ボタン、プレゼンス等）
├── services/              # ビジネスロジック
│   ├── keyOperations.ts   # 鍵操作ロジック
│   ├── reminderService.ts # リマインダー管理
│   └── scheduledCheck.ts  # 定時チェック
└── handlers/              # インタラクションハンドラー
    ├── commandHandlers.ts # スラッシュコマンド処理
    ├── buttonHandlers.ts  # ボタンインタラクション処理
    └── handlerUtils.ts    # ハンドラー共通関数
```

## 開発者向け情報

### Node.js バージョン
このプロジェクトは **Node.js 24.x** で開発されています。
`package.json` の `engines` フィールドでバージョンが指定されています。

### コードフォーマット
コードの一貫性を保つために、[Prettier](https://prettier.io/) を使用しています。
コミットする前に、以下のコマンドでコードをフォーマットしてください。
```bash
npm run format
```

## 環境変数・セキュリティ
- **Token は絶対に Git にコミットしないでください**
  - `src/.gitignore` に `settings.json` が登録されています
  - `src/settings.json.sample` をテンプレートとして使用してください
- Token が漏洩した場合は、Discord 開発者ポータルで即座に再生成してください



