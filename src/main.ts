/**
 * Club Key Manager Bot - メインエントリーポイント
 * 部室の鍵管理を行うDiscord Bot
 */

import { Events, REST, Routes, TextChannel, EmbedBuilder } from "discord.js";
import { client } from "./discord/client";
import { token, id_log_channel } from "./config";
import { commands } from "./discord/commands";
import { mapButtons, mapLabel, mapOpers, mapPresence, borrow_button } from "./discord/discordUI";
import { schedule20OClockCheck } from "./services/scheduledCheck";
import { 
  sendReminderMessage, 
  clearReminderTimer, 
  rescheduleReminderTimer, 
  borrowerInfo, 
  setBorrowerInfo 
} from "./services/reminderService";
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
} from "./config";
import { Key } from "./types";
import { isKey } from "./utils";

// 現在の鍵の状態を格納する変数（初期状態は返却済み）
let var_status: Key = "RETURN";

/**
 * ボットが起動した時のイベントハンドラー
 * 初期設定とスラッシュコマンドの登録を行う
 */
client.once("ready", async (bot) => {
  console.log("Ready!");

  // ボットのユーザー名をコンソールに表示
  if (client.user) {
    console.log(client.user.tag);
  }

  // ボットのステータスを非公開（invisible）に設定
  client.user?.setPresence({
    status: "invisible",
    activities: [],
  });

  // Discord APIとの通信用RESTクライアントを作成
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("スラッシュコマンドを登録しています...");
    // スラッシュコマンドをDiscord APIに登録
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands }
    );
    console.log("スラッシュコマンドの登録が完了しました。");
  } catch (error) {
    console.error("スラッシュコマンドの登録に失敗しました:", error);
  }

  // 定時チェック（デフォルトは20時）をスケジュール
  schedule20OClockCheck(client, var_status, mapButtons, borrow_button);

  // 鍵管理用チャンネルに初期メッセージを送信
  if (id_log_channel) {
    // 返却済み状態のボタンセット（「借りる」ボタン）を取得
    const initialButtonSet = mapButtons.get("RETURN");
    if (initialButtonSet) {
      // チャンネルにメッセージを送信
      (bot.channels?.cache.get(id_log_channel) as TextChannel).send({
        content: "鍵管理Botです. 鍵をに対する操作を選んでください.",
        components: [initialButtonSet],
      });
    }
  }
});

/**
 * インタラクション（ボタンクリックやスラッシュコマンド）が発生した時のイベントハンドラー
 */
client.on(Events.InteractionCreate, async (interaction) => {
  /**
   * ヘルパー関数：コマンドの返信に現在の鍵の状態に応じたボタンを追加
   * @returns 現在の鍵の状態に応じたボタンセット
   */
  const getKeyButtonsForCommand = () => {
    const buttons = mapButtons.get(var_status);
    return buttons || mapButtons.get("RETURN")!;
  };

  // ==============================
  // スラッシュコマンドの処理
  // ==============================
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // /borrow コマンド: 鍵を借りる
    if (commandName === "borrow") {
      const delayMinutes = interaction.options.getInteger("delay-minutes");
      
      // 鍵が返却済みの状態なら借りることができる
      if (var_status === "RETURN") {
        // 鍵の状態を「借りた」に変更
        var_status = "BORROW";
        
        // ユーザー情報を取得
        const userTag = interaction.user.tag;
        const username = userTag.split("#")[1] ? interaction.user.username : userTag;
        const userIconUrl = interaction.user.avatarURL();

        // 埋め込みメッセージを作成
        const embed = new EmbedBuilder()
          .setColor(0x0099ff) // 青色
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
        const buttonSet = mapButtons.get(var_status);

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
              var_status,
              mapButtons,
              borrow_button
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
        const presence = mapPresence.get(var_status);
        if (presence) {
          interaction.client.user?.setPresence(presence);
        }
      } else if (borrowerInfo && (var_status === "BORROW" || var_status === "OPEN" || var_status === "CLOSE")) {
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
            var_status,
            mapButtons,
            borrow_button
          );
        }, delayMs);

        setBorrowerInfo({
          ...borrowerInfo,
          timerId: timerId,
          reminderCount: 0, // カウントをリセット
          borrowedAt: Date.now(), // 基準時刻を更新
        });

        await interaction.reply({
          content: `リマインダー開始時間を${delayMinutes ?? reminderTimeMinutes}分後に設定しました。`,
          components: [getKeyButtonsForCommand()],
        });

        console.log(
          `リマインダー開始時間を${delayMinutes ?? reminderTimeMinutes}分後に更新しました。`
        );
      } else {
        // 無効な状態
        await interaction.reply({
          content: "❌ 無効な状態です。",
          components: [getKeyButtonsForCommand()],
        });
      }
      return;
    }

    // /reminder コマンド: リマインダー機能のON/OFF切り替え
    if (commandName === "reminder") {
      const newState = toggleReminderEnabled();
      await interaction.reply({
        content: `リマインダー機能を${newState ? "ON" : "OFF"}にしました。`,
        components: [getKeyButtonsForCommand()],
      });
      console.log(`リマインダー機能: ${newState ? "ON" : "OFF"}`);
      return;
    }

    // /scheduled-check コマンド: 定時チェック機能のON/OFF切り替え
    if (commandName === "scheduled-check") {
      const newState = toggleScheduledCheckEnabled();
      await interaction.reply({
        content: `定時チェック機能を${newState ? "ON" : "OFF"}にしました。`,
        components: [getKeyButtonsForCommand()],
      });
      console.log(`定時チェック機能: ${newState ? "ON" : "OFF"}`);
      return;
    }

    // /reminder-time コマンド: リマインダー送信間隔を設定（分単位）
    if (commandName === "reminder-time") {
      const minutes = interaction.options.getInteger("minutes");
      if (minutes) {
        setReminderTimeMinutes(minutes);
        
        // 鍵が借りられている場合、リマインダーを再スケジュール
        if (borrowerInfo && var_status !== "RETURN") {
          rescheduleReminderTimer(client, var_status, mapButtons, borrow_button);
          await interaction.reply({
            content: `リマインダー送信時間を${minutes}分に設定しました。`,
            components: [getKeyButtonsForCommand()],
          });
        } else {
          await interaction.reply({
            content: `リマインダー間隔を${minutes}分に設定しました。`,
            components: [getKeyButtonsForCommand()],
          });
        }

        console.log(`リマインダー間隔: ${minutes}分`);
      }
      return;
    }

    // /check-time コマンド: 定時チェックの時刻を設定
    if (commandName === "check-time") {
      const hour = interaction.options.getInteger("hour");
      const minute = interaction.options.getInteger("minute");
      if (hour !== null && minute !== null) {
        setCheckTime(hour, minute);
        
        // スケジュールを即座に再設定
        schedule20OClockCheck(client, var_status, mapButtons, borrow_button);
        
        await interaction.reply({
          content: `定時チェック時刻を${hour}時${minute}分に設定しました。`,
          components: [getKeyButtonsForCommand()],
        });
        console.log(`定時チェック時刻: ${hour}時${minute}分に変更し、スケジュールを再設定しました。`);
      }
      return;
    }

    // /status コマンド: 現在のアラーム設定を表示
    if (commandName === "status") {
      const statusEmbed = new EmbedBuilder()
        .setColor(0x00ff00) // 緑色
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
        components: [getKeyButtonsForCommand()],
      });
      return;
    }

    // /owner コマンド: 鍵の持ち主を変更
    if (commandName === "owner") {
      // 鍵が借りられているかチェック
      if (var_status === "RETURN" || !borrowerInfo) {
        await interaction.reply({
          content: "❌ 現在、鍵は借りられていません。",
          components: [getKeyButtonsForCommand()],
        });
        return;
      }

      // 新しい持ち主を取得
      const newOwner = interaction.options.getUser("user");
      if (!newOwner) {
        await interaction.reply({
          content: "❌ ユーザーが指定されていません。",
          components: [getKeyButtonsForCommand()],
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
            var_status,
            mapButtons,
            borrow_button
          );
        }, reminderTimeMinutes * 60 * 1000); // 0からカウント開始

        setBorrowerInfo({
          userId: newOwner.id,
          username: newOwnerName,
          channelId: interaction.channelId!,
          timerId: timerId,
          borrowedAt: now, // 持ち主変更時刻を記録
          reminderCount: 0, // カウントをリセット
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
          borrowedAt: Date.now(), // 持ち主変更時刻を記録
          reminderCount: 0, // カウントをリセット
        });
        
        console.log(
          `鍵の持ち主を ${oldOwnerName} から ${newOwnerName} に変更しました。リマインダー機能はOFFです。`
        );
      }

      // 持ち主変更を通知するメッセージを作成
      const changeEmbed = new EmbedBuilder()
        .setColor(0xffa500) // オレンジ色
        .setTitle("🔄 鍵の持ち主変更")
        .setDescription(
          `鍵の持ち主を変更しました\n<@${oldOwnerId}> → <@${newOwner.id}>\n${isReminderEnabled ? `⏰ リマインダー: ${reminderTimeMinutes}分後に通知` : ""}`
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [changeEmbed],
        components: [getKeyButtonsForCommand()],
      });

      return;
    }
  }

  // ==============================
  // ボタンクリックの処理
  // ==============================
  
  // インタラクションがボタンでない場合は処理しない
  if (!interaction.isButton()) {
    return;
  }
  
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
  var_status = oper(var_status);

  // 更新後の状態に対応するボタンセットを取得
  const buttonSet = mapButtons.get(var_status);
  if (!buttonSet) {
    throw Error("buttonSet is undefined");
  }

  // 更新後の状態に対応するラベルを取得
  const label = mapLabel.get(var_status);
  if (!label) {
    throw Error("label is undefined");
  }

  // 更新後の状態に対応するPresence（ボットのオンライン状態）を取得
  const presence = mapPresence.get(var_status);
  if (!presence) {
    throw Error("presence is undefined");
  }

  // ボットのステータスを更新
  interaction.client.user.setPresence(presence);

  // ユーザー情報を取得
  const userTag = interaction.user.tag;
  // userTagを#で分割して識別タグがあるかチェック（新しいDiscordではタグが無い場合がある）
  const username = userTag.split("#")[1] ? interaction.user.username : userTag;
  const userIconUrl = interaction.user.avatarURL();

  // 鍵操作の結果を表示する埋め込みメッセージを作成
  const embed = new EmbedBuilder()
    .setColor(0x0099ff) // 水色
    .setAuthor({ name: username, iconURL: userIconUrl ?? undefined }) // ボタンを押したユーザーの情報
    .setTitle(`${label}`) // 行った操作（例：「借りました」）
    .setTimestamp();

  // 鍵を借りた時の場合は、リマインダー設定情報を追加
  if (btn === "BORROW" && var_status === "BORROW") {
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
      components: [], // ボタンを削除
    });
  }

  // ==============================
  // 鍵を借りた時の処理
  // ==============================
  if (btn === "BORROW" && var_status === "BORROW") {
    // 既存のタイマーがあればクリア
    clearReminderTimer();

    // リマインダー機能がONの場合のみタイマーを設定
    if (isReminderEnabled) {
      // 借りたユーザー情報を保存
      const now = Date.now();
      const timerId = setTimeout(() => {
        sendReminderMessage(
          client,
          interaction.user.id,
          username,
          interaction.channelId,
          var_status,
          mapButtons,
          borrow_button
        );
      }, reminderTimeMinutes * 60 * 1000); // 分をミリ秒に変換

      setBorrowerInfo({
        userId: interaction.user.id,
        username: username,
        channelId: interaction.channelId,
        timerId: timerId,
        borrowedAt: now, // 借りた時刻を記録
        reminderCount: 0, // カウントを初期化
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
        borrowedAt: Date.now(), // 借りた時刻を記録
        reminderCount: 0, // カウントを初期化
      });
      console.log(
        `${username}が鍵を借りました。リマインダー機能はOFFです。`
      );
    }
  }

  // ==============================
  // 鍵を返した時の処理
  // ==============================
  if (btn === "RETURN" && var_status === "RETURN") {
    // タイマーをクリア
    clearReminderTimer();
    console.log(`鍵が返却されました。リマインダータイマーをクリアしました。`);
  }
});

// Discordボットにログイン
client.login(token);
