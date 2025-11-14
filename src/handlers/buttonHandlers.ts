/**
 * ボタンインタラクションのハンドラー
 * 鍵の操作ボタンが押された時の処理を管理
 */

import { ButtonInteraction, Colors, EmbedBuilder } from "discord.js";
import { Key } from "../types";
import { isKey, minutesToMs } from "../utils";
import { getUserInfo } from "./handlerUtils";
import { mapButtons, mapLabel, mapOpers, mapPresence, borrowButton } from "../discord/discordUI";
import {
  sendReminderMessage,
  clearReminderTimer,
  setBorrowerInfo
} from "../services/reminderService";
import { config } from "../config";
import { client } from "../discord/client";

/**
 * ボタンインタラクションを処理する関数
 * @param interaction - ボタンインタラクション
 * @param keyStatus - 現在の鍵の状態
 * @returns 更新後の鍵の状態
 */
export const handleButtonInteraction = async (
  interaction: ButtonInteraction,
  keyStatus: Key
): Promise<Key> => {
  // 現在の鍵の状態がKey型かどうかを確認
  if (!isKey(keyStatus)) {
    throw Error("keyStatus is not apropriate");
  }

  // 押されたボタンのカスタムIDを取得
  const btn = interaction.customId;

  // 押されたボタンに対応する操作関数を取得
  const oper = mapOpers.get(btn);
  if (!oper) {
    throw Error("oper is undefined");
  }

  // 操作を実行して鍵の状態を更新
  const newStatus = oper(keyStatus);

  // 更新後の状態に対応するボタンセットを取得
  const buttonSet = mapButtons.get(newStatus);
  if (!buttonSet) {
    throw Error("buttonSet is undefined");
  }

  // 更新後の状態に対応するPresence（ボットのオンライン状態）を取得
  const presence = mapPresence.get(newStatus);
  if (!presence) {
    throw Error("presence is undefined");
  }

  // ボットのステータスを更新
  interaction.client.user?.setPresence(presence);
  
  // ユーザー情報を取得
  const { username, userIconUrl } = getUserInfo(interaction);
  
  // 鍵操作の結果を表示する埋め込みメッセージを作成
  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setAuthor({ name: username, iconURL: userIconUrl ?? undefined })
    .setTimestamp();

  if (newStatus === "CLOSE") {
    if (btn === "BORROW_KEY") {
      embed.setTitle("借りました");
    } else if (btn === "CLOSE") {
      embed.setTitle("閉めました");
    }
  } else {
    const label = mapLabel.get(newStatus);
    if (label) {
      embed.setTitle(label);
    }
  }

  // 鍵を借りた時の場合は、リマインダー設定情報を追加
  if (btn === "BORROW_KEY" && newStatus === "CLOSE") {
    if (config.isReminderEnabled) {
      embed.addFields({
        name: "⏰ リマインダー設定",
        value: `リマインダーが有効です\n・間隔: ${config.reminderTimeMinutes}分ごと\n・定時チェック: ${config.checkHour}時${config.checkMinute}分`,
        inline: false
      });
    } else {
      embed.addFields({
        name: "⏰ リマインダー設定",
        value: `リマインダーは無効です\n・定時チェック: ${config.isScheduledCheckEnabled ? `${config.checkHour}時${config.checkMinute}分` : "無効"}`,
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
      components: [],
    });
  }

  // ==============================
  // 鍵を借りた時の処理
  // ==============================
  if (btn === "BORROW_KEY" && newStatus === "CLOSE") {
    // 既存のタイマーがあればクリア
    clearReminderTimer();

    // リマインダー機能がONの場合のみタイマーを設定
    if (config.isReminderEnabled) {
      const now = Date.now();
      const timerId = setTimeout(() => {
        sendReminderMessage(
          client,
          interaction.user.id,
          interaction.channelId,
          mapButtons,
          borrowButton
        );
      }, minutesToMs(config.reminderTimeMinutes));

      setBorrowerInfo({
        userId: interaction.user.id,
        username: username,
        channelId: interaction.channelId,
        timerId: timerId,
        borrowedAt: now,
        reminderCount: 0,
      });

      console.log(
        `${username}が鍵を借りました。${config.reminderTimeMinutes}分後にリマインダーを送信します。`
      );
    } else {
      // リマインダーOFFの場合でも借りたユーザー情報は保存
      setBorrowerInfo({
        userId: interaction.user.id,
        username: username,
        channelId: interaction.channelId,
        timerId: null,
        borrowedAt: Date.now(),
        reminderCount: 0,
      });
      console.log(
        `${username}が鍵を借りました。リマインダー機能はOFFです。`
      );
    }
  }

  // ==============================
  // 鍵を返した時の処理
  // ==============================
  if (btn === "RETURN" && newStatus === "RETURN") {
    clearReminderTimer();
    console.log(`鍵が返却されました。リマインダータイマーをクリアしました。`);
  }

  return newStatus;
};
