# Club-Key-Manager-Bot2
部室の鍵を管理するボット. ボイスチャンネルを使わずに実装した.

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
   docker compose up -d
   ```

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
- `/borrow [分]` : 鍵を借りる（オプション：リマインダー開始時間を分で指定）
  - 例：`/borrow` → 通常の借りる
  - 例：`/borrow 480` → 480分後にリマインダー開始
  - 既に借りてる状態での実行 → リマインダー時間を更新

#### リマインダー設定
- `/reminder` : リマインダー機能をトグル（ON ↔ OFF）
- `/reminder-time <分>` : リマインダー間隔を変更（分）

#### 定時チェック設定
- `/scheduled-check` : 定時チェック機能をトグル（ON ↔ OFF）
- `/check-time <時> <分>` : 定時チェック時刻を変更

#### その他
- `/status` : 現在のアラーム設定を表示
- `/owner @ユーザー` : 鍵の持ち主を変更

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
    └── buttonHandlers.ts  # ボタンインタラクション処理
```

## 環境変数・セキュリティ
- **Token は絶対に Git にコミットしないでください**
  - `src/.gitignore` に `settings.json` が登録されています
  - `src/settings.json.sample` をテンプレートとして使用してください
- Token が漏洩した場合は、Discord 開発者ポータルで即座に再生成してください



