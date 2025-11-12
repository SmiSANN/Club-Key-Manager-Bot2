/**
 * ボタンインタラクションのハンドラー
 * 鍵の操作ボタンが押された時の処理を管理
 */

import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { Key } from "../types";
import { isKey } from "../utils";
import { mapButtons, mapLabel, mapOpers, mapPresence, borrow_button } from "../discord/discordUI";
import {
  sendReminderMessage,
  clearReminderTimer,
  borrowerInfo,
  setBorrowerInfo
} from "../services/reminderService";
import { reminderTimeMinutes, checkHour, checkMinute, isReminderEnabled, isScheduledCheckEnabled } from "../config";
import { client } from "../discord/client";

/**
 * ボタンインタラクションを処理する関数
 * @param interaction - ボタンインタラクション
 * @param var_status - 現在の鍵の状態
 * @returns 更新後の鍵の状態
 */
export const handleButtonInteraction = async (
  interaction: ButtonInteraction,
  var_status: Key
): Promise<Key> => {
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
  const newStatus = oper(var_status);

  // 更新後の状態に対応するボタンセットを取得
  const buttonSet = mapButtons.get(newStatus);
  if (!buttonSet) {
    throw Error("buttonSet is undefined");
  }

  // 更新後の状態に対応するラベルを取得
  const label = mapLabel.get(newStatus);
  if (!label) {
    throw Error("label is undefined");
  }

  // 更新後の状態に対応するPresence（ボットのオンライン状態）を取得
  const presence = mapPresence.get(newStatus);
  if (!presence) {
    throw Error("presence is undefined");
  }

  // ボットのステータスを更新
  interaction.client.user.setPresence(presence);

  // ユーザー情報を取得
  const userTag = interaction.user.tag;
  const username = userTag.split("#")[1] ? interaction.user.username : userTag;
  const userIconUrl = interaction.user.avatarURL();

  // 鍵操作の結果を表示する埋め込みメッセージを作成
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setAuthor({ name: username, iconURL: userIconUrl ?? undefined })
    .setTitle(`${label}`)
    .setTimestamp();

  // 鍵を借りた時の場合は、リマインダー設定情報を追加
  if (btn === "BORROW" && newStatus === "BORROW") {
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
      components: [],
    });
  }

  // ==============================
  // 鍵を借りた時の処理
  // ==============================
  if (btn === "BORROW" && newStatus === "BORROW") {
    // 既存のタイマーがあればクリア
    clearReminderTimer();

    // リマインダー機能がONの場合のみタイマーを設定
    if (isReminderEnabled) {
      const now = Date.now();
      const timerId = setTimeout(() => {
        sendReminderMessage(
          client,
          interaction.user.id,
          username,
          interaction.channelId,
          newStatus,
          mapButtons,
          borrow_button
        );
      }, reminderTimeMinutes * 60 * 1000);

      setBorrowerInfo({
        userId: interaction.user.id,
        username: username,
        channelId: interaction.channelId,
        timerId: timerId,
        borrowedAt: now,
        reminderCount: 0,
      });

      console.log(
        `${username}が鍵を借りました。${reminderTimeMinutes}分後にリマインダーを送信します。`
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
