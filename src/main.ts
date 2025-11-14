/**
 * Club Key Manager Bot - メインエントリーポイント
 * 部室の鍵管理を行うDiscord Bot
 */

import { Events, Interaction, REST, Routes, TextChannel } from "discord.js";
import { client } from "./discord/client";
import { token, idLogChannel } from "./config";
import { commands } from "./discord/commands";
import { mapButtons, borrowButton } from "./discord/discordUI";
import { schedule20OClockCheck } from "./services/scheduledCheck";
import {
  handleBorrowCommand,
  handleReminderCommand,
  handleScheduledCheckCommand,
  handleReminderTimeCommand,
  handleCheckTimeCommand,
  handleStatusCommand,
  handleOwnerCommand
} from "./handlers/commandHandlers";
import { handleButtonInteraction } from "./handlers/buttonHandlers";
import { Key } from "./types";

// 現在の鍵の状態を格納する変数（初期状態は返却済み）
let keyStatus: Key = "RETURN";

/**
 * 現在の鍵の状態を取得する関数
 * @returns 現在の鍵の状態
 */
export const getKeyStatus = (): Key => keyStatus;

/**
 * 鍵の状態を設定する関数
 * @param newStatus 新しい鍵の状態
 */
export const setKeyStatus = (newStatus: Key): void => {
  keyStatus = newStatus;
};

/**
 * ボットが起動した時のイベントハンドラー
 * 初期設定とスラッシュコマンドの登録を行う
 */
client.once("ready", async (bot) => {
  console.log("Ready!");

  // client.userが存在することを確認
  if (!client.user) {
    console.error("クライアントユーザー情報が取得できませんでした");
    return;
  }

  // ボットのユーザー名をコンソールに表示
  console.log(`${client.user.tag} としてログインしました！`);

  // ボットのステータスを非公開（invisible）に設定
  client.user.setPresence({
    status: "invisible",
    activities: [],
  });

  // Discord APIとの通信用RESTクライアントを作成
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("スラッシュコマンドを登録しています...");
    
    // スラッシュコマンドをDiscord APIに登録
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("スラッシュコマンドの登録が完了しました。");
  } catch (error) {
    console.error("スラッシュコマンドの登録に失敗しました:", error);
  }

  // 定時チェック（デフォルトは20時）をスケジュール
  schedule20OClockCheck(client, mapButtons, borrowButton);

  // 鍵管理用チャンネルに初期メッセージを送信
  if (idLogChannel) {
    // 返却済み状態のボタンセット（「借りる」ボタン）を取得
    const initialButtonSet = mapButtons.get("RETURN");
    if (initialButtonSet) {
      // チャンネルにメッセージを送信
      (bot.channels?.cache.get(idLogChannel) as TextChannel).send({
        content: "鍵管理Botです. 鍵に対する操作を選んでください.",
        components: [initialButtonSet],
      });
    }
  }
});

/**
 * インタラクション(ボタンクリックやスラッシュコマンド)が発生した時のイベントハンドラー
 */
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  // ==============================
  // スラッシュコマンドの処理
  // ==============================
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    switch (commandName) {
      case "borrow":
        keyStatus = await handleBorrowCommand(interaction, keyStatus);
        break;
      case "reminder":
        await handleReminderCommand(interaction, keyStatus);
        break;
      case "scheduled-check":
        await handleScheduledCheckCommand(interaction, keyStatus);
        break;
      case "reminder-time":
        await handleReminderTimeCommand(interaction, keyStatus);
        break;
      case "check-time":
        await handleCheckTimeCommand(interaction, keyStatus);
        break;
      case "status":
        await handleStatusCommand(interaction, keyStatus);
        break;
      case "owner":
        await handleOwnerCommand(interaction, keyStatus);
        break;
      default:
        console.log(`未知のコマンド: ${commandName}`);
    }
    return;
  }

  // ==============================
  // ボタンクリックの処理
  // ==============================
  if (interaction.isButton()) {
    keyStatus = await handleButtonInteraction(interaction, keyStatus);
  }
});

// Discordボットにログイン
client.login(token);
