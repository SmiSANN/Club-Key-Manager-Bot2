/**
 * スラッシュコマンドのハンドラー
 * 各コマンドの処理ロジックを管理
 */

import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from "discord.js";
import { Key } from "../types";
import {
  reminderTimeMinutes,
  checkHour,
  checkMinute,
  isReminderEnabled,
  isScheduledCheckEnabled,
  setReminderTimeMinutes,
  setCheckTime,
  toggleReminderEnabled,
  toggleScheduledCheckEnabled
} from "../config";
import {
  sendReminderMessage,
  clearReminderTimer,
  rescheduleReminderTimer,
  borrowerInfo,
  setBorrowerInfo
} from "../services/reminderService";
import { schedule20OClockCheck } from "../services/scheduledCheck";
import { client } from "../discord/client";
import { mapButtons, borrowButton, mapPresence } from "../discord/discordUI";

/**
 * 現在の鍵の状態に応じたボタンを取得するヘルパー関数
 */
export const getKeyButtonsForCommand = (keyStatus: Key) => {
  const buttons = mapButtons.get(keyStatus);
  return buttons || mapButtons.get("RETURN")!;
};

/**
 * /borrow コマンドのハンドラー
 * 鍵を借りる、またはリマインダー開始時間を更新する
 */
export const handleBorrowCommand = async (
  interaction: ChatInputCommandInteraction,
  keyStatus: Key
): Promise<Key> => {
  const delayMinutes = interaction.options.getInteger("delay-minutes");

  // 鍵が返却済みの状態なら借りることができる
  if (keyStatus === "RETURN") {
    // 鍵の状態を「借りた」に変更
    const newStatus: Key = "BORROW";

    // ユーザー情報を取得
    const userTag = interaction.user.tag;
    const username = userTag.split("#")[1] ? interaction.user.username : userTag;
    const userIconUrl = interaction.user.avatarURL();

    // 埋め込みメッセージを作成
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
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
    const buttonSet = mapButtons.get(newStatus);

    // 返信を送信
    await interaction.reply({
      embeds: [embed],
      components: buttonSet ? [buttonSet] : [],
    });

    // リマインダーを設定
    if (isReminderEnabled) {
      const now = Date.now();
      const delayMs = (delayMinutes ?? reminderTimeMinutes) * 60 * 1000;

      const timerId = setTimeout(() => {
        sendReminderMessage(
          client,
          interaction.user.id,
          username,
          interaction.channelId,
          newStatus,
          mapButtons,
          borrowButton
        );
      }, delayMs);

      setBorrowerInfo({
        userId: interaction.user.id,
        username: username,
        channelId: interaction.channelId,
        timerId: timerId,
        borrowedAt: now,
        reminderCount: 0,
      });

      console.log(
        `${username}が鍵を借りました。${delayMinutes ?? reminderTimeMinutes}分後にリマインダーを送信します。`
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
      console.log(`${username}が鍵を借りました。リマインダー機能はOFFです。`);
    }

    // ボットのステータスを更新
    const presence = mapPresence.get(newStatus);
    if (presence) {
      interaction.client.user?.setPresence(presence);
    }

    return newStatus;
  } else if (borrowerInfo && (keyStatus === "BORROW" || keyStatus === "OPEN" || keyStatus === "CLOSE")) {
    // 既に借りている状態でコマンド実行 → リマインダー開始時間を更新
    const delayMs = (delayMinutes ?? reminderTimeMinutes) * 60 * 1000;

    // 既存のタイマーをクリア
    if (borrowerInfo.timerId) {
      clearTimeout(borrowerInfo.timerId);
    }

    // 新しいタイマーを設定
    const timerId = setTimeout(() => {
      sendReminderMessage(
        client,
        borrowerInfo!.userId,
        borrowerInfo!.username,
        borrowerInfo!.channelId,
        keyStatus,
        mapButtons,
        borrowButton
      );
    }, delayMs);

    setBorrowerInfo({
      ...borrowerInfo,
      timerId: timerId,
      reminderCount: 0,
      borrowedAt: Date.now(),
    });

    await interaction.reply({
      content: `リマインダー開始時間を${delayMinutes ?? reminderTimeMinutes}分後に設定しました。`,
      components: [getKeyButtonsForCommand(keyStatus)],
    });

    console.log(
      `リマインダー開始時間を${delayMinutes ?? reminderTimeMinutes}分後に更新しました。`
    );

    return keyStatus;
  } else {
    // 無効な状態
    await interaction.reply({
      content: "❌ 無効な状態です。",
      components: [getKeyButtonsForCommand(keyStatus)],
    });
    return keyStatus;
  }
};

/**
 * /reminder コマンドのハンドラー
 * リマインダー機能のON/OFF切り替え
 */
export const handleReminderCommand = async (
  interaction: ChatInputCommandInteraction,
  keyStatus: Key
): Promise<void> => {
  const newState = toggleReminderEnabled();
  await interaction.reply({
    content: `リマインダー機能を${newState ? "ON" : "OFF"}にしました。`,
    components: [getKeyButtonsForCommand(keyStatus)],
  });
  console.log(`リマインダー機能: ${newState ? "ON" : "OFF"}`);
};

/**
 * /scheduled-check コマンドのハンドラー
 * 定時チェック機能のON/OFF切り替え
 */
export const handleScheduledCheckCommand = async (
  interaction: ChatInputCommandInteraction,
  keyStatus: Key
): Promise<void> => {
  const newState = toggleScheduledCheckEnabled();
  await interaction.reply({
    content: `定時チェック機能を${newState ? "ON" : "OFF"}にしました。`,
    components: [getKeyButtonsForCommand(keyStatus)],
  });
  console.log(`定時チェック機能: ${newState ? "ON" : "OFF"}`);
};

/**
 * /reminder-time コマンドのハンドラー
 * リマインダー送信間隔を設定（分単位）
 */
export const handleReminderTimeCommand = async (
  interaction: ChatInputCommandInteraction,
  keyStatus: Key
): Promise<void> => {
  const minutes = interaction.options.getInteger("minutes");
  if (minutes) {
    setReminderTimeMinutes(minutes);

    // 鍵が借りられている場合、リマインダーを再スケジュール
    if (borrowerInfo && keyStatus !== "RETURN") {
      rescheduleReminderTimer(client, keyStatus, mapButtons, borrowButton);
      await interaction.reply({
        content: `リマインダー送信時間を${minutes}分に設定しました。`,
        components: [getKeyButtonsForCommand(keyStatus)],
      });
    } else {
      await interaction.reply({
        content: `リマインダー間隔を${minutes}分に設定しました。`,
        components: [getKeyButtonsForCommand(keyStatus)],
      });
    }

    console.log(`リマインダー間隔: ${minutes}分`);
  }
};

/**
 * /check-time コマンドのハンドラー
 * 定時チェックの時刻を設定
 */
export const handleCheckTimeCommand = async (
  interaction: ChatInputCommandInteraction,
  keyStatus: Key
): Promise<void> => {
  const hour = interaction.options.getInteger("hour");
  const minute = interaction.options.getInteger("minute");
  if (hour !== null && minute !== null) {
    setCheckTime(hour, minute);

    // スケジュールを即座に再設定
    schedule20OClockCheck(client, keyStatus, mapButtons, borrowButton);

    await interaction.reply({
      content: `定時チェック時刻を${hour}時${minute}分に設定しました。`,
      components: [getKeyButtonsForCommand(keyStatus)],
    });
    console.log(`定時チェック時刻: ${hour}時${minute}分に変更し、スケジュールを再設定しました。`);
  }
};

/**
 * /status コマンドのハンドラー
 * 現在のアラーム設定を表示
 */
export const handleStatusCommand = async (
  interaction: ChatInputCommandInteraction,
  keyStatus: Key
): Promise<void> => {
  const statusEmbed = new EmbedBuilder()
    .setColor(0x00ff00)
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
    components: [getKeyButtonsForCommand(keyStatus)],
  });
};

/**
 * /owner コマンドのハンドラー
 * 鍵の持ち主を変更
 */
export const handleOwnerCommand = async (
  interaction: ChatInputCommandInteraction,
  keyStatus: Key
): Promise<void> => {
  // 鍵が借りられているかチェック
  if (keyStatus === "RETURN" || !borrowerInfo) {
    await interaction.reply({
      content: "❌ 現在、鍵は借りられていません。",
      components: [getKeyButtonsForCommand(keyStatus)],
    });
    return;
  }

  // 新しい持ち主を取得
  const newOwner = interaction.options.getUser("user");
  if (!newOwner) {
    await interaction.reply({
      content: "❌ ユーザーが指定されていません。",
      components: [getKeyButtonsForCommand(keyStatus)],
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
        client,
        newOwner.id,
        newOwnerName,
        interaction.channelId!,
        keyStatus,
        mapButtons,
        borrowButton
      );
    }, reminderTimeMinutes * 60 * 1000);

    setBorrowerInfo({
      userId: newOwner.id,
      username: newOwnerName,
      channelId: interaction.channelId!,
      timerId: timerId,
      borrowedAt: now,
      reminderCount: 0,
    });

    console.log(
      `鍵の持ち主を ${oldOwnerName} から ${newOwnerName} に変更しました。リマインダーカウントをリセットし、${reminderTimeMinutes}分後に通知します。`
    );
  } else {
    // リマインダーOFFの場合
    setBorrowerInfo({
      userId: newOwner.id,
      username: newOwnerName,
      channelId: interaction.channelId!,
      timerId: null,
      borrowedAt: Date.now(),
      reminderCount: 0,
    });

    console.log(
      `鍵の持ち主を ${oldOwnerName} から ${newOwnerName} に変更しました。リマインダー機能はOFFです。`
    );
  }

  // 持ち主変更を通知するメッセージを作成
  const changeEmbed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle("🔄 鍵の持ち主変更")
    .setDescription(
      `鍵の持ち主を変更しました\n<@${oldOwnerId}> → <@${newOwner.id}>\n${isReminderEnabled ? `⏰ リマインダー: ${reminderTimeMinutes}分後に通知` : ""}`
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [changeEmbed],
    components: [getKeyButtonsForCommand(keyStatus)],
  });
};
