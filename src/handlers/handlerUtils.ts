    import { ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { BorrowerInfo } from "../types";
import { config } from "../config";
import { setBorrowerInfo, clearReminderTimer } from "../services/reminderService";
import { minutesToMs } from "../utils";

/**
 * インタラクションからユーザー情報を取得するヘルパー関数
 * @param interaction - ボタンまたはコマンドのインタラクション
 * @returns ユーザー名とアイコンURL
 */
export const getUserInfo = (interaction: ButtonInteraction | ChatInputCommandInteraction) => {
  return {
    username: interaction.user.username,
    userIconUrl: interaction.user.avatarURL()
  };
};

/**
 * リマインダー設定情報を埋め込みメッセージに追加するヘルパー関数
 * @param embed - 埋め込みメッセージ
 * @returns 更新された埋め込みメッセージ
 */
export const addReminderSettingsToEmbed = (embed: EmbedBuilder): EmbedBuilder => {
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
  return embed;
};

/**
 * 鍵を借りたユーザーの情報を保存するヘルパー関数
 * @param userId - ユーザーID
 * @param username - ユーザー名
 * @param channelId - チャンネルID
 * @param timerId - リマインダータイマーID（オプション）
 * @returns 保存されたユーザー情報
 */
export const saveBorrowerInfo = (
  userId: string,
  username: string,
  channelId: string,
  timerId?: NodeJS.Timeout
): BorrowerInfo => {
  const borrowerInfo: BorrowerInfo = {
    userId,
    username,
    channelId,
    timerId: timerId ?? null,
    borrowedAt: Date.now(),
    reminderCount: 0,
  };
  setBorrowerInfo(borrowerInfo);
  return borrowerInfo;
};

/**
 * リマインダータイマーを設定するヘルパー関数
 * @param delay - 遅延時間（ミリ秒）
 * @param callback - コールバック関数
 * @returns タイマーID
 */
export const createReminderTimer = (
  delay: number,
  callback: () => void
): NodeJS.Timeout => {
  return setTimeout(callback, delay);
};