// Discord.jsライブラリから必要なコンポーネントをインポート
import {
  ActionRowBuilder, // ボタンなどのUIコンポーネントを配置するための行ビルダー
  ButtonBuilder, // ボタンを作成するためのビルダー
  ButtonStyle, // ボタンのスタイル（色など）を定義
  Client, // Discordボットのクライアント
  GatewayIntentBits, // ボットが受信するイベントの種類を指定
  Events, // Discordのイベント名の定数
  TextChannel, // テキストチャンネルの型
  EmbedBuilder, // リッチな埋め込みメッセージを作成するためのビルダー
  PresenceStatusData, // ボットのステータス（オンライン、オフラインなど）の型
  REST, // Discord APIとの通信を行うRESTクライアント
  Routes, // Discord APIのエンドポイントを指定
  SlashCommandBuilder, // スラッシュコマンドを作成するためのビルダー
} from "discord.js";
import fs from "fs"; // ファイルシステム操作用
import path from "path"; // ファイルパス操作用
// import { messagingSlack, createMessage } from "./slack"; // Slack連携機能（現在はコメントアウト）

// 設定ファイル（setting.json）を読み込んでパース
const settings = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../src/setting.json"), "utf8")
);

// Discordクライアントを作成し、必要な権限（Intents）を設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // サーバー情報の取得
    GatewayIntentBits.GuildMessages, // メッセージの送受信
    GatewayIntentBits.MessageContent, // メッセージ内容の取得
    GatewayIntentBits.GuildMembers, // メンバー情報の取得
  ],
});

// 設定ファイルから値を取得
const id_log_channel = settings.LogChannel; // ログを送信するDiscordチャンネルのID
const token = settings.Token; // Discordボットのトークン

// 文字列をboolean型に変換する関数
// "true"または"1"の場合にtrueを返し、それ以外はfalseを返す
const string2boolean = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }
  return value.toLowerCase() === "true" || value === "1";
};

// 操作卓モードかどうかを設定ファイルから取得
// 操作卓モードの場合、鍵の「開ける」「閉める」操作が無効になる
const mode_console = string2boolean(settings.ModeConsole);

// const isUseSlack = string2boolean(settings.Slack.Use); // Slack連携の有効/無効（現在はコメントアウト）

// 鍵の返却リマインダー時間（分）、デフォルトは60分
let reminderTimeMinutes = settings.ReminderTimeMinutes || 60;

// 定時チェックの時刻（時）、デフォルトは20時
let checkHour = settings.checkHour || 20;

// 定時チェックの時刻（分）、デフォルトは0分
let checkMinute = settings.checkMinute || 0;

// リマインダー機能のON/OFF（初期状態はON）
let isReminderEnabled = true;

// 定時チェック機能のON/OFF（初期状態はON）
let isScheduledCheckEnabled = true;

// 鍵の状態を表す型定義
// BORROW: 借りている状態
// OPEN: 部屋を開けている状態
// CLOSE: 部屋を閉めている状態（まだ鍵は返却していない）
// RETURN: 返却済みの状態
type Key = "BORROW" | "OPEN" | "CLOSE" | "RETURN";

// 現在の鍵の状態を格納する変数（初期状態は返却済み）
let var_status: Key = "RETURN";

// 鍵を借りたユーザーの情報を保存する型定義
type BorrowerInfo = {
  userId: string; // ユーザーのDiscord ID
  username: string; // ユーザー名
  channelId: string; // メッセージを送信するチャンネルのID
  timerId: ReturnType<typeof setTimeout> | null; // リマインダータイマーのID
  borrowedAt: number; // 鍵を借りた時刻（ミリ秒）
  reminderCount: number; // リマインダーの送信回数
};

// 現在鍵を借りているユーザーの情報（借りていない場合はnull）
let borrowerInfo: BorrowerInfo | null = null;

// 定時チェックのタイマーID
let scheduledCheckTimerId: ReturnType<typeof setTimeout> | null = null;

// 鍵への操作を表す関数の型定義
// 現在の状態を受け取り、操作後の新しい状態を返す
type oper_key = (status: Key) => Key;

// 鍵を借りる操作の関数
// 返却済み（RETURN）の状態でのみ借りることができ、借りた状態（BORROW）になる
const borrow_key: oper_key = (status: Key) => {
  return status === "RETURN" ? "BORROW" : status;
};

// 鍵で部屋を開ける操作の関数
// 借りている（BORROW）または閉めている（CLOSE）状態で開けることができる
// 操作卓モードの場合は開けることができない
const open_key: oper_key = (status: Key) => {
  return (status === "BORROW" || status === "CLOSE") && !mode_console
    ? "OPEN"
    : status;
};

// 鍵で部屋を閉める操作の関数
// 開いている（OPEN）状態でのみ閉めることができる
// 操作卓モードの場合は閉めることができない
const close_key: oper_key = (status: Key) => {
  return status === "OPEN" && !mode_console ? "CLOSE" : status;
};

// 鍵を返却する操作の関数
// 借りている（BORROW）または閉めている（CLOSE）状態で返却できる
const return_key: oper_key = (status: Key) => {
  return status === "BORROW" || status === "CLOSE" ? "RETURN" : status;
};

/**
 * リマインダーメッセージを送信する関数
 * 指定されたユーザーに鍵の返却を促すメッセージを送信する
 * 
 * @param userId - メッセージを送信するユーザーのDiscord ID
 * @param username - ユーザー名
 * @param channelId - メッセージを送信するチャンネルのID
 */
const sendReminderMessage = async (
  userId: string,
  username: string,
  channelId: string
) => {
  // リマインダー機能がOFFの場合は送信しない
  if (!isReminderEnabled) {
    console.log("リマインダー機能がOFFのため、送信をスキップしました。");
    return;
  }
  
  // 借りた人の情報がない場合は送信できない
  if (!borrowerInfo) {
    console.log("借りた人の情報がないため、リマインダーを送信できません。");
    return;
  }

  // リマインダー送信回数をカウントアップ
  borrowerInfo.reminderCount++;
  const count = borrowerInfo.reminderCount;
  
  try {
    // チャンネルを取得
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      // 埋め込みメッセージを作成
      const embed = new EmbedBuilder()
        .setColor(0xff0000) // 赤色で警告を表現
        .setTitle(`⌛️返却リマインダー (${count}回目)`)
        .setDescription(
          `<@${userId}> さん、鍵を借りてから${reminderTimeMinutes * count}分が経過しました。\n返却を忘れていませんか？`
        )
        .setTimestamp();

      // 現在の鍵の状態に応じたボタンセットを取得
      const currentButtonSet = mapButtons.get(var_status) || new ActionRowBuilder<ButtonBuilder>().addComponents(borrow_button);

      // メッセージを送信
      await (channel as TextChannel).send({
        content: `<@${userId}>`, // ユーザーにメンション
        embeds: [embed],
        components: [currentButtonSet], // ボタンも一緒に送信
      });

      console.log(`リマインダーを送信しました (${count}回目)`);

      // Slack通知も送る（現在はコメントアウト）
      // if (isUseSlack) {
      //   messagingSlack(
      //     `${username}さんへ (${count}回目): 鍵を借りてから${reminderTimeMinutes * count}分が経過しました。返却をお願いします。`
      //   )(settings.Slack.WebhookUrl);
      // }

      // 次のリマインダーをスケジュール（リマインダー機能がONで、まだ返却されていない場合）
      if (borrowerInfo && isReminderEnabled && var_status !== "RETURN") {
        const timerId = setTimeout(() => {
          sendReminderMessage(
            borrowerInfo!.userId,
            borrowerInfo!.username,
            borrowerInfo!.channelId
          );
        }, reminderTimeMinutes * 60 * 1000); // 分をミリ秒に変換

        borrowerInfo.timerId = timerId;
        console.log(`次のリマインダーを${reminderTimeMinutes}分後にスケジュールしました。`);
      }
    }
  } catch (error) {
    console.error("リマインダーメッセージの送信に失敗しました:", error);
  }
};

/**
 * リマインダータイマーをクリアする関数
 * 鍵が返却された時などに呼び出される
 */
const clearReminderTimer = () => {
  if (borrowerInfo?.timerId) {
    clearTimeout(borrowerInfo.timerId);
    borrowerInfo = null;
  }
};

/**
 * リマインダータイマーを再設定する関数
 * リマインダー間隔が変更された時などに呼び出される
 */
const rescheduleReminderTimer = () => {
  // 借りている人がいない、またはリマインダーがOFFの場合は何もしない
  if (!borrowerInfo || !isReminderEnabled) {
    return;
  }

  // 既存のタイマーをクリア
  if (borrowerInfo.timerId) {
    clearTimeout(borrowerInfo.timerId);
  }

  // 借りてからの経過時間を計算（分単位）
  const now = Date.now();
  const elapsedMinutes = (now - borrowerInfo.borrowedAt) / 1000 / 60;
  
  // 次のリマインダーまでの時間を計算
  const nextReminderAt = (borrowerInfo.reminderCount + 1) * reminderTimeMinutes;
  const remainingMinutes = nextReminderAt - elapsedMinutes;

  console.log(`経過時間: ${Math.floor(elapsedMinutes)}分, 次のリマインダーまで: ${Math.floor(remainingMinutes)}分 (${borrowerInfo.reminderCount + 1}回目)`);

  // まだ次のリマインダー時間に達していない場合は再スケジュール
  if (remainingMinutes > 0) {
    const timerId = setTimeout(() => {
      sendReminderMessage(
        borrowerInfo!.userId,
        borrowerInfo!.username,
        borrowerInfo!.channelId
      );
    }, remainingMinutes * 60 * 1000);

    borrowerInfo.timerId = timerId;
    console.log(`リマインダーを再スケジュールしました。${Math.floor(remainingMinutes)}分後に通知します。`);
  } else {
    // 既に時間が経過している場合は即座に送信
    console.log(`既にリマインダー時間を経過しているため、即座に通知します。`);
    sendReminderMessage(
      borrowerInfo.userId,
      borrowerInfo.username,
      borrowerInfo.channelId
    );
  }
};

/**
 * 定時チェック関数
 * 設定された時刻（デフォルト20時）に鍵が返却されていない場合、
 * 借りているユーザーに通知を送信する
 */
const check20OClock = async () => {
  // 定時チェック機能がOFFの場合は何もしない
  if (!isScheduledCheckEnabled) {
    console.log("定時チェック機能がOFFのため、チェックをスキップしました。");
    return;
  }
  
  // 鍵がRETURN状態でない場合（借りられている場合）
  if (var_status !== "RETURN" && borrowerInfo) {
    try {
      const channel = await client.channels.fetch(borrowerInfo.channelId);
      if (channel && channel.isTextBased()) {
        // 埋め込みメッセージを作成
        const embed = new EmbedBuilder()
          .setColor(0xff0000) // 赤色で警告を表現
          .setTitle("⏰️鍵返却確認")
          .setDescription(
            `<@${borrowerInfo.userId}> さん、定時になりましたが鍵がまだ返却されていません。\nemail：jm-hcgakusei@stf.teu.ac.jp`
          )
          .setTimestamp();

        // 現在の鍵の状態に応じたボタンセットを取得
        const currentButtonSet = mapButtons.get(var_status) || new ActionRowBuilder<ButtonBuilder>().addComponents(borrow_button);

        // メッセージを送信
        await (channel as TextChannel).send({
          content: `<@${borrowerInfo.userId}>`, // ユーザーにメンション
          embeds: [embed],
          components: [currentButtonSet], // ボタンも一緒に送信
        });

        console.log(`定時チェック: ${borrowerInfo.username}に返却リマインダーを送信しました。`);

        // Slack通知も送る（現在はコメントアウト）
        // if (isUseSlack) {
        //   messagingSlack(
        //     `【定時確認】${borrowerInfo.username}さんへ: 鍵がまだ返却されていません。返却をお願いします。`
        //   )(settings.Slack.WebhookUrl);
        // }
      }
    } catch (error) {
      console.error("定時チェックメッセージの送信に失敗しました:", error);
    }
  } else {
    console.log("定時チェック: 鍵は返却されています。");
  }
};

/**
 * 次の定時チェックまでの時間をミリ秒で計算する関数
 * 
 * @returns 次の定時チェックまでの時間（ミリ秒）
 */
const getMillisecondsUntil20OClock = (): number => {
  const now = new Date();
  const target = new Date();
  target.setHours(checkHour, checkMinute, 0, 0); // 設定された時刻に設定

  console.log(`現在時刻: ${now.toLocaleString('ja-JP')}`);
  console.log(`ターゲット時刻: ${target.toLocaleString('ja-JP')}`);
  console.log(`now.getTime(): ${now.getTime()}, target.getTime(): ${target.getTime()}`);

  // もし現在時刻が既に設定時刻を過ぎていたら、翌日の設定時刻に設定
  if (now.getTime() >= target.getTime()) {
    console.log(`${checkHour}時${checkMinute}分を過ぎているため、翌日の${checkHour}時${checkMinute}分に設定します`);
    target.setDate(target.getDate() + 1);
    console.log(`新しいターゲット時刻: ${target.toLocaleString('ja-JP')}`);
  }

  const diff = target.getTime() - now.getTime();
  console.log(`時間差（ミリ秒）: ${diff}, 分: ${Math.round(diff / 1000 / 60)}`);

  return diff;
};

/**
 * 定時チェックをスケジュールする関数
 * 設定された時刻に定期的にチェックを実行するようにタイマーを設定する
 */
const schedule20OClockCheck = () => {
  // 既存のタイマーをクリア
  if (scheduledCheckTimerId) {
    clearTimeout(scheduledCheckTimerId);
    scheduledCheckTimerId = null;
  }

  // 次のチェックをスケジュールする内部関数
  const scheduleNext = () => {
    const msUntil20 = getMillisecondsUntil20OClock();
    
    console.log(`次の定時チェックまで: ${Math.round(msUntil20 / 1000 / 60)}分 (${checkHour}時${checkMinute}分)`);

    // タイマーを設定
    scheduledCheckTimerId = setTimeout(() => {
      check20OClock(); // チェックを実行
      scheduleNext(); // 次の日のチェックをスケジュール
    }, msUntil20);
  };
  
  scheduleNext();
};

// ボタンを定義
// 「借りる」ボタン - 緑色（成功）スタイル
const borrow_button = new ButtonBuilder()
  .setCustomId("BORROW")
  .setLabel("借りる")
  .setStyle(ButtonStyle.Success);

// 「開ける」ボタン - 緑色（成功）スタイル
const opne_button = new ButtonBuilder()
  .setCustomId("OPEN")
  .setLabel("開ける")
  .setStyle(ButtonStyle.Success);

// 「閉める」ボタン - 赤色（危険）スタイル
const close_button = new ButtonBuilder()
  .setCustomId("CLOSE")
  .setLabel("閉める")
  .setStyle(ButtonStyle.Danger);

// 「返す」ボタン - 赤色（危険）スタイル
const return_button = new ButtonBuilder()
  .setCustomId("RETURN")
  .setLabel("返す")
  .setStyle(ButtonStyle.Danger);

// 鍵の状態とラベルを対応付けるマップ
// メッセージに表示するラベルを管理
const mapLabel: Map<Key, string> = new Map([
  ["RETURN", "返しました"],
  ["BORROW", "借りました"],
  ["OPEN", "開けました"],
  ["CLOSE", "閉めました"],
]);

// 鍵の状態とボタンのセットを対応付けるマップ
// 各状態で表示すべきボタンを管理
const mapButtons: Map<Key, ActionRowBuilder<ButtonBuilder>> = new Map([
  // 返却済み状態: 「借りる」ボタンのみ表示
  [
    "RETURN",
    new ActionRowBuilder<ButtonBuilder>().addComponents(borrow_button),
  ],
  // 借りた状態: 操作卓モードでない場合は「開ける」と「返す」、操作卓モードの場合は「返す」のみ
  [
    "BORROW",
    !mode_console
      ? new ActionRowBuilder<ButtonBuilder>()
          .addComponents(opne_button)
          .addComponents(return_button)
      : new ActionRowBuilder<ButtonBuilder>().addComponents(return_button),
  ],
  // 開けた状態: 「閉める」ボタンのみ表示
  ["OPEN", new ActionRowBuilder<ButtonBuilder>().addComponents(close_button)],
  // 閉めた状態: 「返す」と「開ける」ボタンを表示
  [
    "CLOSE",
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(return_button)
      .addComponents(opne_button),
  ],
]);

// 鍵の状態とそれに対応する操作を紐づけるマップ
// ボタンが押された時にどの操作関数を実行するかを管理
const mapOpers: Map<Key, oper_key> = new Map([
  ["RETURN", return_key],
  ["BORROW", borrow_key],
  ["OPEN", open_key],
  ["CLOSE", close_key],
]);

// Activityの型定義（ボットのアクティビティ状態）
type Activity = {
  name: string; // アクティビティの名前（例：「部室」）
};

// Presenceの型定義（ボットのオンライン状態とアクティビティ）
type Presence = {
  status: PresenceStatusData; // ステータス（オンライン、退席中、非表示など）
  activities: Activity[]; // アクティビティのリスト
};

// 鍵の状態とPresenceを紐づけるマップ
// 鍵の状態によってボットのオンライン状態を変更する
const mapPresence: Map<Key, Presence> = new Map([
  // 返却済み: 非表示状態
  [
    "RETURN",
    {
      status: "invisible",
      activities: [],
    },
  ],
  // 借りた状態: 退席中状態
  [
    "BORROW",
    {
      status: "idle",
      activities: [],
    },
  ],
  // 開けた状態: オンライン状態で「部室」というアクティビティを表示
  [
    "OPEN",
    {
      status: "online",
      activities: [{ name: "部室" }],
    },
  ],
  // 閉めた状態: 退席中状態
  [
    "CLOSE",
    {
      status: "idle",
      activities: [],
    },
  ],
]);

/**
 * ボットが起動した時のイベントハンドラー
 * 初期設定とスラッシュコマンドの登録を行う
 */
client.once("ready", async (bot) => {
  console.log("Ready!");

  // ボットのユーザー名をコンソールに表示
  if (client.user) {
    console.log(client.user.tag);
  }

  // ボットのステータスを非公開（invisible）に設定
  client.user?.setPresence({
    status: "invisible",
    activities: [],
  });

  // スラッシュコマンドの定義
  const commands = [
    // /borrow コマンド: 鍵を借りる（オプション：リマインダー開始時間を指定）
    new SlashCommandBuilder()
      .setName("borrow")
      .setDescription("鍵を借りる（オプション：リマインダー開始時間を分で指定）")
      .addIntegerOption(option =>
        option.setName("delay-minutes")
          .setDescription("指定分後にリマインダー開始（指定なしはデフォルト）")
          .setRequired(false)
          .setMinValue(0)
      ),
    // /reminder コマンド: リマインダー機能のON/OFF切り替え
    new SlashCommandBuilder()
      .setName("reminder")
      .setDescription("リマインダー機能のON/OFF（トグル）"),
    // /scheduled-check コマンド: 定時チェック機能のON/OFF切り替え
    new SlashCommandBuilder()
      .setName("scheduled-check")
      .setDescription("定時チェック機能のON/OFF（トグル）"),
    // /reminder-time コマンド: リマインダー送信間隔を設定（分単位）
    new SlashCommandBuilder()
      .setName("reminder-time")
      .setDescription("リマインダー送信時間を設定（分）")
      .addIntegerOption(option =>
        option.setName("minutes")
          .setDescription("リマインダー送信までの時間（分）")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(1440)
      ),
    // /reminder-time-ms コマンド: リマインダー送信間隔を設定（ミリ秒単位）
    new SlashCommandBuilder()
      .setName("reminder-time-ms")
      .setDescription("リマインダー送信時間を設定（ミリ秒）")
      .addIntegerOption(option =>
        option.setName("milliseconds")
          .setDescription("リマインダー送信までの時間（ミリ秒）")
          .setRequired(true)
          .setMinValue(1)
      ),
    // /check-time コマンド: 定時チェックの時刻を設定
    new SlashCommandBuilder()
      .setName("check-time")
      .setDescription("定時チェックの時刻を設定")
      .addIntegerOption(option =>
        option.setName("hour")
          .setDescription("時（0-23）")
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(23)
      )
      .addIntegerOption(option =>
        option.setName("minute")
          .setDescription("分（0-59）")
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(59)
      ),
    // /status コマンド: 現在のアラーム設定を表示
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("現在のアラーム設定を表示"),
    // /owner コマンド: 鍵の持ち主を変更
    new SlashCommandBuilder()
      .setName("owner")
      .setDescription("鍵の持ち主を変更")
      .addUserOption(option =>
        option.setName("user")
          .setDescription("新しい持ち主")
          .setRequired(true)
      )
  ].map(command => command.toJSON());

  // Discord APIとの通信用RESTクライアントを作成
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("スラッシュコマンドを登録しています...");
    // スラッシュコマンドをDiscord APIに登録
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands }
    );
    console.log("スラッシュコマンドの登録が完了しました。");
  } catch (error) {
    console.error("スラッシュコマンドの登録に失敗しました:", error);
  }

  // 定時チェック（デフォルトは20時）をスケジュール
  schedule20OClockCheck();

  // 鍵管理用チャンネルに初期メッセージを送信
  if (id_log_channel) {
    // 返却済み状態のボタンセット（「借りる」ボタン）を取得
    const initialButtonSet: ActionRowBuilder<ButtonBuilder> =
      mapButtons.get("RETURN") ?? new ActionRowBuilder<ButtonBuilder>();
    // チャンネルにメッセージを送信
    (bot.channels?.cache.get(id_log_channel) as TextChannel).send({
      content: "鍵管理Botです. 鍵をに対する操作を選んでください.",
      components: [initialButtonSet],
    });
  }
});

/**
 * 型ガード関数：文字列がKey型かどうかを確認
 * TypeScriptの型安全性を保つために使用
 * 
 * @param value - チェックする文字列
 * @returns valueがKey型の値である場合true
 */
const isKey = (value: string): value is Key => {
  return (
    value === "BORROW" ||
    value === "OPEN" ||
    value === "CLOSE" ||
    value === "RETURN"
  );
};

/**
 * インタラクション（ボタンクリックやスラッシュコマンド）が発生した時のイベントハンドラー
 */
client.on(Events.InteractionCreate, async (interaction) => {
  /**
   * ヘルパー関数：コマンドの返信に現在の鍵の状態に応じたボタンを追加
   * @returns 現在の鍵の状態に応じたボタンセット
   */
  const getKeyButtonsForCommand = (): ActionRowBuilder<ButtonBuilder> => {
    const buttons = mapButtons.get(var_status);
    return buttons || new ActionRowBuilder<ButtonBuilder>().addComponents(borrow_button);
  };

  // ==============================
  // スラッシュコマンドの処理
  // ==============================
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // /borrow コマンド: 鍵を借りる
    if (commandName === "borrow") {
      const delayMinutes = interaction.options.getInteger("delay-minutes");
      
      // 鍵が返却済みの状態なら借りることができる
      if (var_status === "RETURN") {
        // 鍵の状態を「借りた」に変更
        var_status = "BORROW";
        
        // ユーザー情報を取得
        const userTag = interaction.user.tag;
        const username = userTag.split("#")[1] ? interaction.user.username : userTag;
        const userIconUrl = interaction.user.avatarURL();

        // 埋め込みメッセージを作成
        const embed = new EmbedBuilder()
          .setColor(0x0099ff) // 青色
          .setAuthor({ name: username, iconURL: userIconUrl ?? undefined })
          .setTitle("借りました")
          .setTimestamp();

        // リマインダー設定の情報を追加
        if (isReminderEnabled) {
          embed.addFields({
            name: "⏰ リマインダー設定",
            value: `リマインダーが有効です\n・間隔: ${reminderTimeMinutes}分ごと\n・定時チェック: ${checkHour}時${checkMinute}分`,
            inline: false
          });
        } else {
          embed.addFields({
            name: "⏰ リマインダー設定",
            value: `リマインダーは無効です\n・定時チェック: ${isScheduledCheckEnabled ? `${checkHour}時${checkMinute}分` : "無効"}`,
            inline: false
          });
        }

        // ボタンセットを取得
        const buttonSet = mapButtons.get(var_status) || new ActionRowBuilder<ButtonBuilder>().addComponents(borrow_button);

        // 返信を送信
        await interaction.reply({
          embeds: [embed],
          components: [buttonSet],
        });

        // リマインダーを設定
        if (isReminderEnabled) {
          const now = Date.now();
          const delayMs = (delayMinutes ?? reminderTimeMinutes) * 60 * 1000;
          
          const timerId = setTimeout(() => {
            sendReminderMessage(
              interaction.user.id,
              username,
              interaction.channelId
            );
          }, delayMs);

          borrowerInfo = {
            userId: interaction.user.id,
            username: username,
            channelId: interaction.channelId,
            timerId: timerId,
            borrowedAt: now,
            reminderCount: 0,
          };

          console.log(
            `${username}が鍵を借りました。${delayMinutes ?? reminderTimeMinutes}分後にリマインダーを送信します。`
          );
        } else {
          // リマインダーOFFの場合でも借りたユーザー情報は保存
          borrowerInfo = {
            userId: interaction.user.id,
            username: username,
            channelId: interaction.channelId,
            timerId: null,
            borrowedAt: Date.now(),
            reminderCount: 0,
          };
          console.log(`${username}が鍵を借りました。リマインダー機能はOFFです。`);
        }

        // ボットのステータスを更新
        const presence = mapPresence.get(var_status);
        if (presence) {
          interaction.client.user?.setPresence(presence);
        }
      } else if (borrowerInfo && (var_status === "BORROW" || var_status === "OPEN" || var_status === "CLOSE")) {
        // 既に借りている状態でコマンド実行 → リマインダー開始時間を更新
        const delayMs = (delayMinutes ?? reminderTimeMinutes) * 60 * 1000;

        // 既存のタイマーをクリア
        if (borrowerInfo.timerId) {
          clearTimeout(borrowerInfo.timerId);
        }

        // 新しいタイマーを設定
        const timerId = setTimeout(() => {
          sendReminderMessage(
            borrowerInfo!.userId,
            borrowerInfo!.username,
            borrowerInfo!.channelId
          );
        }, delayMs);

        borrowerInfo.timerId = timerId;
        borrowerInfo.reminderCount = 0; // カウントをリセット
        borrowerInfo.borrowedAt = Date.now(); // 基準時刻を更新

        await interaction.reply({
          content: `リマインダー開始時間を${delayMinutes ?? reminderTimeMinutes}分後に設定しました。`,
          components: [getKeyButtonsForCommand()],
        });

        console.log(
          `リマインダー開始時間を${delayMinutes ?? reminderTimeMinutes}分後に更新しました。`
        );
      } else {
        // 無効な状態
        await interaction.reply({
          content: "❌ 無効な状態です。",
          components: [getKeyButtonsForCommand()],
        });
      }
      return;
    }

    // /reminder コマンド: リマインダー機能のON/OFF切り替え
    if (commandName === "reminder") {
      isReminderEnabled = !isReminderEnabled;
      await interaction.reply({
        content: `リマインダー機能を${isReminderEnabled ? "ON" : "OFF"}にしました。`,
        components: [getKeyButtonsForCommand()],
      });
      console.log(`リマインダー機能: ${isReminderEnabled ? "ON" : "OFF"}`);
      return;
    }

    // /scheduled-check コマンド: 定時チェック機能のON/OFF切り替え
    if (commandName === "scheduled-check") {
      isScheduledCheckEnabled = !isScheduledCheckEnabled;
      await interaction.reply({
        content: `定時チェック機能を${isScheduledCheckEnabled ? "ON" : "OFF"}にしました。`,
        components: [getKeyButtonsForCommand()],
      });
      console.log(`定時チェック機能: ${isScheduledCheckEnabled ? "ON" : "OFF"}`);
      return;
    }

    // /reminder-time コマンド: リマインダー送信間隔を設定（分単位）
    if (commandName === "reminder-time") {
      const minutes = interaction.options.getInteger("minutes");
      if (minutes) {
        reminderTimeMinutes = minutes;
        
        // 鍵が借りられている場合、リマインダーを再スケジュール
        if (borrowerInfo && var_status !== "RETURN") {
          rescheduleReminderTimer();
          await interaction.reply({
            content: `リマインダー送信時間を${minutes}分に設定しました。`,
            components: [getKeyButtonsForCommand()],
          });
        } else {
          await interaction.reply({
            content: `リマインダー間隔を${minutes}分に設定しました。`,
            components: [getKeyButtonsForCommand()],
          });
        }

        console.log(`リマインダー間隔: ${minutes}分`);
      }
      return;
    }

    // /reminder-time-ms コマンド: リマインダー送信間隔を設定（ミリ秒単位）
    if (commandName === "reminder-time-ms") {
      const milliseconds = interaction.options.getInteger("milliseconds");
      if (milliseconds) {
        reminderTimeMinutes = Math.floor(milliseconds / 1000 / 60); // ミリ秒を分に変換
        
        // 鍵が借りられている場合、リマインダーを再スケジュール
        if (borrowerInfo && var_status !== "RETURN") {
          rescheduleReminderTimer();
          await interaction.reply({
            content: `リマインダー送信時間を${milliseconds}ミリ秒（≈${reminderTimeMinutes}分）に設定しました。`,
            components: [getKeyButtonsForCommand()],
          });
        } else {
          await interaction.reply({
            content: `リマインダー間隔を${milliseconds}ミリ秒（≈${reminderTimeMinutes}分）に設定しました。`,
            components: [getKeyButtonsForCommand()],
          });
        }

        console.log(`リマインダー間隔: ${milliseconds}ミリ秒（${reminderTimeMinutes}分に変換）`);
      }
      return;
    }

    // /check-time コマンド: 定時チェックの時刻を設定
    if (commandName === "check-time") {
      const hour = interaction.options.getInteger("hour");
      const minute = interaction.options.getInteger("minute");
      if (hour !== null && minute !== null) {
        checkHour = hour;
        checkMinute = minute;
        
        // スケジュールを即座に再設定
        schedule20OClockCheck();
        
        await interaction.reply({
          content: `定時チェック時刻を${hour}時${minute}分に設定しました。`,
          components: [getKeyButtonsForCommand()],
        });
        console.log(`定時チェック時刻: ${hour}時${minute}分に変更し、スケジュールを再設定しました。`);
      }
      return;
    }

    // /status コマンド: 現在のアラーム設定を表示
    if (commandName === "status") {
      const statusEmbed = new EmbedBuilder()
        .setColor(0x00ff00) // 緑色
        .setTitle("⚙️ アラーム設定状況")
        .addFields(
          { name: "リマインダー機能", value: isReminderEnabled ? "✅ ON" : "❌ OFF", inline: true },
          { name: "定時チェック機能", value: isScheduledCheckEnabled ? "✅ ON" : "❌ OFF", inline: true },
          { name: "リマインダー時間", value: `${reminderTimeMinutes}分`, inline: true },
          { name: "定時チェック時刻", value: `${checkHour}時${checkMinute}分`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [statusEmbed],
        components: [getKeyButtonsForCommand()],
      });
      return;
    }

    // /owner コマンド: 鍵の持ち主を変更
    if (commandName === "owner") {
      // 鍵が借りられているかチェック
      if (var_status === "RETURN" || !borrowerInfo) {
        await interaction.reply({
          content: "❌ 現在、鍵は借りられていません。",
          components: [getKeyButtonsForCommand()],
        });
        return;
      }

      // 新しい持ち主を取得
      const newOwner = interaction.options.getUser("user");
      if (!newOwner) {
        await interaction.reply({
          content: "❌ ユーザーが指定されていません。",
          components: [getKeyButtonsForCommand()],
        });
        return;
      }

      // 旧持ち主の情報を保存
      const oldOwnerName = borrowerInfo.username;
      const oldOwnerId = borrowerInfo.userId;
      const newOwnerTag = newOwner.tag;
      const newOwnerName = newOwnerTag.split("#")[1] ? newOwner.username : newOwnerTag;

      // 旧持ち主のリマインダータイマーをクリア
      clearReminderTimer();

      // 新しい持ち主の情報を設定（リマインダーカウントをリセット）
      if (isReminderEnabled) {
        // 新しい持ち主用に新しいタイマーを設定（カウントをリセット）
        const now = Date.now();
        const timerId = setTimeout(() => {
          sendReminderMessage(
            newOwner.id,
            newOwnerName,
            interaction.channelId!
          );
        }, reminderTimeMinutes * 60 * 1000); // 0からカウント開始

        borrowerInfo = {
          userId: newOwner.id,
          username: newOwnerName,
          channelId: interaction.channelId!,
          timerId: timerId,
          borrowedAt: now, // 持ち主変更時刻を記録
          reminderCount: 0, // カウントをリセット
        };

        console.log(
          `鍵の持ち主を ${oldOwnerName} から ${newOwnerName} に変更しました。リマインダーカウントをリセットし、${reminderTimeMinutes}分後に通知します。`
        );
      } else {
        // リマインダーOFFの場合
        borrowerInfo = {
          userId: newOwner.id,
          username: newOwnerName,
          channelId: interaction.channelId!,
          timerId: null,
          borrowedAt: Date.now(), // 持ち主変更時刻を記録
          reminderCount: 0, // カウントをリセット
        };
        
        console.log(
          `鍵の持ち主を ${oldOwnerName} から ${newOwnerName} に変更しました。リマインダー機能はOFFです。`
        );
      }

      // 持ち主変更を通知するメッセージを作成
      const changeEmbed = new EmbedBuilder()
        .setColor(0xffa500) // オレンジ色
        .setTitle("🔄 鍵の持ち主変更")
        .setDescription(
          `鍵の持ち主を変更しました\n<@${oldOwnerId}> → <@${newOwner.id}>\n${isReminderEnabled ? `⏰ リマインダー: ${reminderTimeMinutes}分後に通知` : ""}`
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [changeEmbed],
        components: [getKeyButtonsForCommand()],
      });

      return;
    }
  }

  // ==============================
  // ボタンクリックの処理
  // ==============================
  
  // インタラクションがボタンでない場合は処理しない
  if (!interaction.isButton()) {
    return;
  }
  
  // 現在の鍵の状態がKey型かどうかを確認
  if (!isKey(var_status)) {
    throw Error("var_status is not apropriate");
  }

  // 押されたボタンのカスタムIDを取得
  const btn = interaction.customId;
  
  // カスタムIDがKey型かどうかを確認
  if (!isKey(btn)) {
    throw Error("buttonInteraction.customId is not Key");
  }

  // 押されたボタンに対応する操作関数を取得
  const oper = mapOpers.get(btn);
  if (!oper) {
    throw Error("oper is undefined");
  }
  
  // 操作を実行して鍵の状態を更新
  var_status = oper(var_status);

  // 更新後の状態に対応するボタンセットを取得
  const buttonSet = mapButtons.get(var_status);
  if (!buttonSet) {
    throw Error("buttonSet is undefined");
  }

  // 更新後の状態に対応するラベルを取得
  const label = mapLabel.get(var_status);
  if (!label) {
    throw Error("label is undefined");
  }

  // 更新後の状態に対応するPresence（ボットのオンライン状態）を取得
  const presence = mapPresence.get(var_status);
  if (!presence) {
    throw Error("presence is undefined");
  }

  // ボットのステータスを更新
  interaction.client.user.setPresence(presence);

  // ユーザー情報を取得
  const userTag = interaction.user.tag;
  // userTagを#で分割して識別タグがあるかチェック（新しいDiscordではタグが無い場合がある）
  const username = userTag.split("#")[1] ? interaction.user.username : userTag;
  const userIconUrl = interaction.user.avatarURL();

  // 鍵操作の結果を表示する埋め込みメッセージを作成
  const embed = new EmbedBuilder()
    .setColor(0x0099ff) // 水色
    .setAuthor({ name: username, iconURL: userIconUrl ?? undefined }) // ボタンを押したユーザーの情報
    .setTitle(`${label}`) // 行った操作（例：「借りました」）
    .setTimestamp();

  // 鍵を借りた時の場合は、リマインダー設定情報を追加
  if (btn === "BORROW" && var_status === "BORROW") {
    if (isReminderEnabled) {
      embed.addFields({
        name: "⏰ リマインダー設定",
        value: `リマインダーが有効です\n・間隔: ${reminderTimeMinutes}分ごと\n・定時チェック: ${checkHour}時${checkMinute}分`,
        inline: false
      });
    } else {
      embed.addFields({
        name: "⏰ リマインダー設定",
        value: `リマインダーは無効です\n・定時チェック: ${isScheduledCheckEnabled ? `${checkHour}時${checkMinute}分` : "無効"}`,
        inline: false
      });
    }
  }

  // インタラクションに返信
  await interaction.reply({
    embeds: [embed],
    components: [buttonSet],
  });

  // 前回のメッセージを取得
  const previousMessage = await interaction.channel?.messages.fetch(
    interaction.message.id
  );

  // 前回のメッセージがあれば、ボタンを無効化（二重クリック防止）
  if (previousMessage) {
    previousMessage.edit({
      embeds: previousMessage.embeds,
      components: [], // ボタンを削除
    });
  }

  // ==============================
  // 鍵を借りた時の処理
  // ==============================
  if (btn === "BORROW" && var_status === "BORROW") {
    // 既存のタイマーがあればクリア
    clearReminderTimer();

    // リマインダー機能がONの場合のみタイマーを設定
    if (isReminderEnabled) {
      // 借りたユーザー情報を保存
      const now = Date.now();
      const timerId = setTimeout(() => {
        sendReminderMessage(
          interaction.user.id,
          username,
          interaction.channelId
        );
      }, reminderTimeMinutes * 60 * 1000); // 分をミリ秒に変換

      borrowerInfo = {
        userId: interaction.user.id,
        username: username,
        channelId: interaction.channelId,
        timerId: timerId,
        borrowedAt: now, // 借りた時刻を記録
        reminderCount: 0, // カウントを初期化
      };

      console.log(
        `${username}が鍵を借りました。${reminderTimeMinutes}分後にリマインダーを送信します。`
      );
    } else {
      // リマインダーOFFの場合でも借りたユーザー情報は保存
      borrowerInfo = {
        userId: interaction.user.id,
        username: username,
        channelId: interaction.channelId,
        timerId: null,
        borrowedAt: Date.now(), // 借りた時刻を記録
        reminderCount: 0, // カウントを初期化
      };
      console.log(
        `${username}が鍵を借りました。リマインダー機能はOFFです。`
      );
    }
  }

  // ==============================
  // 鍵を返した時の処理
  // ==============================
  if (btn === "RETURN" && var_status === "RETURN") {
    // タイマーをクリア
    clearReminderTimer();
    console.log(`鍵が返却されました。リマインダータイマーをクリアしました。`);
  }

  // Slack通知（現在はコメントアウト）
  // if (isUseSlack) {
  //   messagingSlack(createMessage(username)(label))(settings.Slack.WebhookUrl);
  // }
});

// Discordボットにログイン
client.login(token);
