import { Events, REST, Routes, TextChannel } from "discord.js";
import {
  discordBot,
  config,
  presenter,
  scheduledCheckService,
  keyRepository
} from "./container";
import { commands } from "./discord/commands";
import {
  handleBorrowCommand,
  handleReminderCommand,
  handleScheduledCheckCommand,
  handleReminderTimeCommand,
  handleCheckTimeCommand,
  handleStatusCommand,
  handleOwnerCommand
} from "./interfaces/handlers/SlashCommandHandlers";
import { handleButtonInteraction } from "./interfaces/handlers/ButtonHandlers";

// ボットが起動した時のイベントハンドラー
discordBot.onReady(async () => {
  console.log("Ready!");

  if (!discordBot.client.user) {
    console.error("クライアントユーザー情報が取得できませんでした");
    return;
  }

  console.log(`${discordBot.client.user.tag} としてログインしました！`);

  discordBot.client.user.setPresence({
    status: "invisible",
    activities: [],
  });

  const rest = new REST({ version: "10" }).setToken(config.token);

  try {
    console.log("スラッシュコマンドを登録しています...");
    await rest.put(
      Routes.applicationCommands(discordBot.client.user.id),
      { body: commands }
    );
    console.log("スラッシュコマンドの登録が完了しました。");
  } catch (error) {
    console.error("スラッシュコマンドの登録に失敗しました:", error);
  }

  // 定時チェックを開始
  scheduledCheckService.start();

  // 鍵管理用チャンネルに初期メッセージを送信
  if (config.logChannelId) {
    // 返却済み状態のボタンセット（「借りる」ボタン）を取得
    // Note: In original, it sends "RETURN" buttons regardless of actual status?
    // Or should it send current status? Original sent "RETURN".
    // But if we persist state, we should probably send current status.
    // Let's send current status.
    const status = await keyRepository.get();
    const initialButtonSet = presenter.getButtons(status);

    if (initialButtonSet) {
      const channel = discordBot.client.channels.cache.get(config.logChannelId) as TextChannel;
      if (channel) {
        channel.send({
          content: "鍵管理Botです. 鍵に対する操作を選んでください.",
          components: [initialButtonSet],
        });
      }
    }
  }
});

// インタラクションハンドラー
discordBot.onInteractionCreate(async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    switch (commandName) {
      case "borrow":
        await handleBorrowCommand(interaction);
        break;
      case "reminder":
        await handleReminderCommand(interaction);
        break;
      case "scheduled-check":
        await handleScheduledCheckCommand(interaction);
        break;
      case "reminder-time":
        await handleReminderTimeCommand(interaction);
        break;
      case "check-time":
        await handleCheckTimeCommand(interaction);
        break;
      case "status":
        await handleStatusCommand(interaction);
        break;
      case "owner":
        await handleOwnerCommand(interaction);
        break;
      default:
        console.log(`未知のコマンド: ${commandName}`);
    }
    return;
  }

  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  }
});

// ログイン
discordBot.login();
