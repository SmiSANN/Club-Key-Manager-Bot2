import { TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from "discord.js";
import { Key, BorrowerInfo } from "../types";
import { checkHour, checkMinute, isScheduledCheckEnabled } from "../config";
import { borrowerInfo } from "./reminderService";

// 定時チェックのタイマーID
let scheduledCheckTimerId: ReturnType<typeof setTimeout> | null = null;

/**
 * 定時チェック関数
 * 設定された時刻（デフォルト20時）に鍵が返却されていない場合、
 * 借りているユーザーに通知を送信する
 * 
 * @param client - Discordクライアント
 * @param keyStatus - 現在の鍵の状態
 * @param mapButtons - 鍵の状態とボタンのマップ
 * @param borrowButton - 借りるボタン
 */
export const check20OClock = async (
  client: any,
  keyStatus: Key,
  mapButtons: Map<Key, ActionRowBuilder<ButtonBuilder>>,
  borrowButton: ButtonBuilder
) => {
  // 定時チェック機能がOFFの場合は何もしない
  if (!isScheduledCheckEnabled) {
    console.log("定時チェック機能がOFFのため、チェックをスキップしました。");
    return;
  }
  
  // 鍵がRETURN状態でない場合（借りられている場合）
  if (keyStatus !== "RETURN" && borrowerInfo) {
    try {
      const channel = await client.channels.fetch(borrowerInfo.channelId);
      if (channel && channel.isTextBased()) {
        // 埋め込みメッセージを作成
        const embed = new EmbedBuilder()
          .setColor(0xff0000) // 赤色で警告を表現
          .setTitle("⏰️鍵返却確認")
          .setDescription(
            `<@${borrowerInfo.userId}> さん、定時になりましたが鍵がまだ返却されていません。\nemail：jm-hcgakusei@stf.teu.ac.jp`
          )
          .setTimestamp();

        // 現在の鍵の状態に応じたボタンセットを取得
        const currentButtonSet = mapButtons.get(keyStatus) || new ActionRowBuilder<ButtonBuilder>().addComponents(borrowButton);

        // メッセージを送信
        await (channel as TextChannel).send({
          content: `<@${borrowerInfo.userId}>`, // ユーザーにメンション
          embeds: [embed],
          components: [currentButtonSet], // ボタンも一緒に送信
        });

        console.log(`定時チェック: ${borrowerInfo.username}に返却リマインダーを送信しました。`);
      }
    } catch (error) {
      console.error("定時チェックメッセージの送信に失敗しました:", error);
    }
  } else {
    console.log("定時チェック: 鍵は返却されています。");
  }
};

/**
 * 次の定時チェックまでの時間をミリ秒で計算する関数
 * 
 * @returns 次の定時チェックまでの時間（ミリ秒）
 */
export const getMillisecondsUntil20OClock = (): number => {
  const now = new Date();
  const target = new Date();
  target.setHours(checkHour, checkMinute, 0, 0); // 設定された時刻に設定

  console.log(`現在時刻: ${now.toLocaleString('ja-JP')}`);
  console.log(`ターゲット時刻: ${target.toLocaleString('ja-JP')}`);
  console.log(`now.getTime(): ${now.getTime()}, target.getTime(): ${target.getTime()}`);

  // もし現在時刻が既に設定時刻を過ぎていたら、翌日の設定時刻に設定
  if (now.getTime() >= target.getTime()) {
    console.log(`${checkHour}時${checkMinute}分を過ぎているため、翌日の${checkHour}時${checkMinute}分に設定します`);
    target.setDate(target.getDate() + 1);
    console.log(`新しいターゲット時刻: ${target.toLocaleString('ja-JP')}`);
  }

  const diff = target.getTime() - now.getTime();
  console.log(`時間差（ミリ秒）: ${diff}, 分: ${Math.round(diff / 1000 / 60)}`);

  return diff;
};

/**
 * 定時チェックをスケジュールする関数
 * 設定された時刻に定期的にチェックを実行するようにタイマーを設定する
 * 
 * @param client - Discordクライアント
 * @param keyStatus - 現在の鍵の状態
 * @param mapButtons - 鍵の状態とボタンのマップ
 * @param borrowButton - 借りるボタン
 */
export const schedule20OClockCheck = (
  client: any,
  keyStatus: Key,
  mapButtons: Map<Key, ActionRowBuilder<ButtonBuilder>>,
  borrowButton: ButtonBuilder
) => {
  // 既存のタイマーをクリア
  if (scheduledCheckTimerId) {
    clearTimeout(scheduledCheckTimerId);
    scheduledCheckTimerId = null;
  }

  // 次のチェックをスケジュールする内部関数
  const scheduleNext = () => {
    const msUntil20 = getMillisecondsUntil20OClock();
    
    console.log(`次の定時チェックまで: ${Math.round(msUntil20 / 1000 / 60)}分 (${checkHour}時${checkMinute}分)`);

    // タイマーを設定
    scheduledCheckTimerId = setTimeout(() => {
      check20OClock(client, keyStatus, mapButtons, borrowButton); // チェックを実行
      scheduleNext(); // 次の日のチェックをスケジュール
    }, msUntil20);
  };
  
  scheduleNext();
};
