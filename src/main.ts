/**
 * Club Key Manager Bot - メインエントリーポイント
 * 部室の鍵管理を行うDiscord Bot
 */

import { Events, REST, Routes, TextChannel } from "discord.js";
import { client } from "./discord/client";
import { token, id_log_channel } from "./config";
import { commands } from "./discord/commands";
import { mapButtons, borrow_button } from "./discord/discordUI";
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
let var_status: Key = "RETURN";

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
  schedule20OClockCheck(client, var_status, mapButtons, borrow_button);

  // 鍵管理用チャンネルに初期メッセージを送信
  if (id_log_channel) {
    // 返却済み状態のボタンセット（「借りる」ボタン）を取得
    const initialButtonSet = mapButtons.get("RETURN");
    if (initialButtonSet) {
      // チャンネルにメッセージを送信
      (bot.channels?.cache.get(id_log_channel) as TextChannel).send({
        content: "鍵管理Botです. 鍵をに対する操作を選んでください.",
        components: [initialButtonSet],
      });
    }
  }
});

/**
 * インタラクション（ボタンクリックやスラッシュコマンド）が発生した時のイベントハンドラー
 */
client.on(Events.InteractionCreate, async (interaction) => {
  // ==============================
  // スラッシュコマンドの処理
  // ==============================
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    switch (commandName) {
      case "borrow":
        var_status = await handleBorrowCommand(interaction, var_status);
        break;
      case "reminder":
        await handleReminderCommand(interaction, var_status);
        break;
      case "scheduled-check":
        await handleScheduledCheckCommand(interaction, var_status);
        break;
      case "reminder-time":
        await handleReminderTimeCommand(interaction, var_status);
        break;
      case "check-time":
        await handleCheckTimeCommand(interaction, var_status);
        break;
      case "status":
        await handleStatusCommand(interaction, var_status);
        break;
      case "owner":
        await handleOwnerCommand(interaction, var_status);
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
    var_status = await handleButtonInteraction(interaction, var_status);
  }
});

// Discordボットにログイン
client.login(token);
