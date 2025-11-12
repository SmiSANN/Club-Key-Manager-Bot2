import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Key, OperKey, Presence } from "../types";
import { mode_console } from "../config";
import { borrow_key, open_key, close_key, return_key } from "../services/keyOperations";

// ボタンを定義
// 「借りる」ボタン - 緑色（成功）スタイル
export const borrow_button = new ButtonBuilder()
  .setCustomId("BORROW")
  .setLabel("借りる")
  .setStyle(ButtonStyle.Success);

// 「開ける」ボタン - 緑色（成功）スタイル
export const opne_button = new ButtonBuilder()
  .setCustomId("OPEN")
  .setLabel("開ける")
  .setStyle(ButtonStyle.Success);

// 「閉める」ボタン - 赤色（危険）スタイル
export const close_button = new ButtonBuilder()
  .setCustomId("CLOSE")
  .setLabel("閉める")
  .setStyle(ButtonStyle.Danger);

// 「返す」ボタン - 赤色（危険）スタイル
export const return_button = new ButtonBuilder()
  .setCustomId("RETURN")
  .setLabel("返す")
  .setStyle(ButtonStyle.Danger);

// 鍵の状態とラベルを対応付けるマップ
// メッセージに表示するラベルを管理
export const mapLabel: Map<Key, string> = new Map([
  ["RETURN", "返しました"],
  ["BORROW", "借りました"],
  ["OPEN", "開けました"],
  ["CLOSE", "閉めました"],
]);

// 鍵の状態とボタンのセットを対応付けるマップ
// 各状態で表示すべきボタンを管理
export const mapButtons: Map<Key, ActionRowBuilder<ButtonBuilder>> = new Map([
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
export const mapOpers: Map<Key, OperKey> = new Map([
  ["RETURN", return_key],
  ["BORROW", borrow_key],
  ["OPEN", open_key],
  ["CLOSE", close_key],
]);

// 鍵の状態とPresenceを紐づけるマップ
// 鍵の状態によってボットのオンライン状態を変更する
export const mapPresence: Map<Key, Presence> = new Map([
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
