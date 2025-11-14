import fs from "fs";
import path from "path";
import { string2boolean } from "./utils";

/**
 * 設定ファイル（settings.json）の型定義
 */
interface Settings {
  LogChannel: string;
  Token: string;
  ModeConsole?: string | boolean;
  ReminderTimeMinutes?: number;
  checkHour?: number;
  checkMinute?: number;
}

// 設定ファイル（settings.json）を読み込んでパース
let settings: Settings;
try {
  settings = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../src/settings.json"), "utf8")
  );
} catch (err) {
  console.error(
    "設定ファイル settings.json の読み込みまたはパースに失敗しました。\n" +
    "エラー内容: " + err + "\n" +
    "settings.json が存在しない場合は settings.json.sample をコピーして作成してください。"
  );
  process.exit(1);
}

// 設定ファイルから値を取得
export const idLogChannel = settings.LogChannel; // ログを送信するDiscordチャンネルのID
export const token = settings.Token; // Discordボットのトークン

// 操作卓モードかどうかを設定ファイルから取得
// 操作卓モードの場合、鍵の「開ける」「閉める」操作が無効になる
export const modeConsole = string2boolean(settings.ModeConsole);

// 動的に変更可能な設定値をオブジェクトでラップ
export const config = {
  // 鍵の返却リマインダー時間（分）、デフォルトは60分
  reminderTimeMinutes: settings.ReminderTimeMinutes || 60,
  
  // 定時チェックの時刻（時）、デフォルトは20時
  checkHour: settings.checkHour || 20,
  
  // 定時チェックの時刻（分）、デフォルトは0分
  checkMinute: settings.checkMinute || 0,
  
  // リマインダー機能のON/OFF（初期状態はON）
  isReminderEnabled: true,
  
  // 定時チェック機能のON/OFF（初期状態はON）
  isScheduledCheckEnabled: true,
};

/**
 * リマインダー時間を更新する関数
 * @param minutes - 新しいリマインダー時間（分）
 */
export const setReminderTimeMinutes = (minutes: number) => {
  config.reminderTimeMinutes = minutes;
};

/**
 * 定時チェック時刻を更新する関数
 * @param hour - 時（0-23）
 * @param minute - 分（0-59）
 */
export const setCheckTime = (hour: number, minute: number) => {
  config.checkHour = hour;
  config.checkMinute = minute;
};

/**
 * リマインダー機能のON/OFFを切り替える関数
 */
export const toggleReminderEnabled = () => {
  config.isReminderEnabled = !config.isReminderEnabled;
  return config.isReminderEnabled;
};

/**
 * 定時チェック機能のON/OFFを切り替える関数
 */
export const toggleScheduledCheckEnabled = () => {
  config.isScheduledCheckEnabled = !config.isScheduledCheckEnabled;
  return config.isScheduledCheckEnabled;
};
