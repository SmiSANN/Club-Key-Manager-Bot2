import { SlashCommandBuilder } from "discord.js";

/**
 * スラッシュコマンドの定義
 */
export const commands = [
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
