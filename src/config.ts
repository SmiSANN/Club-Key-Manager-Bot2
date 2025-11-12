import fs from "fs";
import path from "path";
import { string2boolean } from "./utils";

// 設定ファイル（settings.json）を読み込んでパース
export const settings = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../src/settings.json"), "utf8")
);

// 設定ファイルから値を取得
export const idLogChannel = settings.LogChannel; // ログを送信するDiscordチャンネルのID
export const token = settings.Token; // Discordボットのトークン

// 操作卓モードかどうかを設定ファイルから取得
// 操作卓モードの場合、鍵の「開ける」「閉める」操作が無効になる
export const modeConsole = string2boolean(settings.ModeConsole);

// 鍵の返却リマインダー時間（分）、デフォルトは60分
export let reminderTimeMinutes = settings.ReminderTimeMinutes || 60;

// 定時チェックの時刻（時）、デフォルトは20時
export let checkHour = settings.checkHour || 20;

// 定時チェックの時刻（分）、デフォルトは0分
export let checkMinute = settings.checkMinute || 0;

// リマインダー機能のON/OFF（初期状態はON）
export let isReminderEnabled = true;

// 定時チェック機能のON/OFF（初期状態はON）
export let isScheduledCheckEnabled = true;

/**
 * リマインダー時間を更新する関数
 * @param minutes - 新しいリマインダー時間（分）
 */
export const setReminderTimeMinutes = (minutes: number) => {
  reminderTimeMinutes = minutes;
};

/**
 * 定時チェック時刻を更新する関数
 * @param hour - 時（0-23）
 * @param minute - 分（0-59）
 */
export const setCheckTime = (hour: number, minute: number) => {
  checkHour = hour;
  checkMinute = minute;
};

/**
 * リマインダー機能のON/OFFを切り替える関数
 */
export const toggleReminderEnabled = () => {
  isReminderEnabled = !isReminderEnabled;
  return isReminderEnabled;
};

/**
 * 定時チェック機能のON/OFFを切り替える関数
 */
export const toggleScheduledCheckEnabled = () => {
  isScheduledCheckEnabled = !isScheduledCheckEnabled;
  return isScheduledCheckEnabled;
};
