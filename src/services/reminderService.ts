import { TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from "discord.js";
import { BorrowerInfo, Key } from "../types";
import { reminderTimeMinutes, isReminderEnabled } from "../config";

// 現在鍵を借りているユーザーの情報（借りていない場合はnull）
export let borrowerInfo: BorrowerInfo | null = null;

/**
 * リマインダーメッセージを送信する関数
 * 指定されたユーザーに鍵の返却を促すメッセージを送信する
 * 
 * @param client - Discordクライアント
 * @param userId - メッセージを送信するユーザーのDiscord ID
 * @param username - ユーザー名
 * @param channelId - メッセージを送信するチャンネルのID
 * @param keyStatus - 現在の鍵の状態
 * @param mapButtons - 鍵の状態とボタンのマップ
 * @param borrowButton - 借りるボタン
 */
export const sendReminderMessage = async (
  client: any,
  userId: string,
  username: string,
  channelId: string,
  keyStatus: Key,
  mapButtons: Map<Key, ActionRowBuilder<ButtonBuilder>>,
  borrowButton: ButtonBuilder
) => {
  // リマインダー機能がOFFの場合は送信しない
  if (!isReminderEnabled) {
    console.log("リマインダー機能がOFFのため、送信をスキップしました。");
    return;
  }
  
  // 借りた人の情報がない場合は送信できない
  if (!borrowerInfo) {
    console.log("借りた人の情報がないため、リマインダーを送信できません。");
    return;
  }

  // リマインダー送信回数をカウントアップ
  borrowerInfo.reminderCount++;
  const count = borrowerInfo.reminderCount;
  
  try {
    // チャンネルを取得
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      // 埋め込みメッセージを作成
      const embed = new EmbedBuilder()
        .setColor(0xff0000) // 赤色で警告を表現
        .setTitle(`⌛️返却リマインダー (${count}回目)`)
        .setDescription(
          `<@${userId}> さん、鍵を借りてから${reminderTimeMinutes * count}分が経過しました。\n返却を忘れていませんか？`
        )
        .setTimestamp();

      // 現在の鍵の状態に応じたボタンセットを取得
      const currentButtonSet = mapButtons.get(keyStatus) || new ActionRowBuilder<ButtonBuilder>().addComponents(borrowButton);

      // メッセージを送信
      await (channel as TextChannel).send({
        content: `<@${userId}>`, // ユーザーにメンション
        embeds: [embed],
        components: [currentButtonSet], // ボタンも一緒に送信
      });

      console.log(`リマインダーを送信しました (${count}回目)`);

      // 次のリマインダーをスケジュール（リマインダー機能がONで、まだ返却されていない場合）
      if (borrowerInfo && isReminderEnabled && keyStatus !== "RETURN") {
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
        }, reminderTimeMinutes * 60 * 1000); // 分をミリ秒に変換

        borrowerInfo.timerId = timerId;
        console.log(`次のリマインダーを${reminderTimeMinutes}分後にスケジュールしました。`);
      }
    }
  } catch (error) {
    console.error("リマインダーメッセージの送信に失敗しました:", error);
  }
};

/**
 * リマインダータイマーをクリアする関数
 * 鍵が返却された時などに呼び出される
 */
export const clearReminderTimer = () => {
  if (borrowerInfo?.timerId) {
    clearTimeout(borrowerInfo.timerId);
    borrowerInfo = null;
  }
};

/**
 * リマインダータイマーを再設定する関数
 * リマインダー間隔が変更された時などに呼び出される
 * 
 * @param client - Discordクライアント
 * @param keyStatus - 現在の鍵の状態
 * @param mapButtons - 鍵の状態とボタンのマップ
 * @param borrowButton - 借りるボタン
 */
export const rescheduleReminderTimer = (
  client: any,
  keyStatus: Key,
  mapButtons: Map<Key, ActionRowBuilder<ButtonBuilder>>,
  borrowButton: ButtonBuilder
) => {
  // 借りている人がいない、またはリマインダーがOFFの場合は何もしない
  if (!borrowerInfo || !isReminderEnabled) {
    return;
  }

  // 既存のタイマーをクリア
  if (borrowerInfo.timerId) {
    clearTimeout(borrowerInfo.timerId);
  }

  // 借りてからの経過時間を計算（分単位）
  const now = Date.now();
  const elapsedMinutes = (now - borrowerInfo.borrowedAt) / 1000 / 60;
  
  // 次のリマインダーまでの時間を計算
  const nextReminderAt = (borrowerInfo.reminderCount + 1) * reminderTimeMinutes;
  const remainingMinutes = nextReminderAt - elapsedMinutes;

  console.log(`経過時間: ${Math.floor(elapsedMinutes)}分, 次のリマインダーまで: ${Math.floor(remainingMinutes)}分 (${borrowerInfo.reminderCount + 1}回目)`);

  // まだ次のリマインダー時間に達していない場合は再スケジュール
  if (remainingMinutes > 0) {
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
    }, remainingMinutes * 60 * 1000);

    borrowerInfo.timerId = timerId;
    console.log(`リマインダーを再スケジュールしました。${Math.floor(remainingMinutes)}分後に通知します。`);
  } else {
    // 既に時間が経過している場合は即座に送信
    console.log(`既にリマインダー時間を経過しているため、即座に通知します。`);
    sendReminderMessage(
      client,
      borrowerInfo.userId,
      borrowerInfo.username,
      borrowerInfo.channelId,
      keyStatus,
      mapButtons,
      borrowButton
    );
  }
};

/**
 * borrowerInfoを設定する関数
 * @param info - 新しい借りた人の情報
 */
export const setBorrowerInfo = (info: BorrowerInfo | null) => {
  borrowerInfo = info;
};
