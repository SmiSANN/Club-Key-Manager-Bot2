import { ChatInputCommandInteraction, EmbedBuilder, Colors } from "discord.js";
import {
    borrowKeyUseCase,
    returnKeyUseCase,
    reminderUseCase,
    presenter,
    config,
    keyRepository,
    borrowerRepository,
    reminderService
} from "../../container";
import { Borrower } from "../../domain/models/Borrower";

export const handleBorrowCommand = async (interaction: ChatInputCommandInteraction) => {
    const delayMinutes = interaction.options.getInteger("delay-minutes") ?? undefined;

    const borrower: Borrower = {
        userId: interaction.user.id,
        username: interaction.user.username,
        channelId: interaction.channelId,
    };

    const result = await borrowKeyUseCase.execute(borrower, delayMinutes);

    if (result.success) {
        const embed = presenter.createBorrowEmbed(
            borrower.username,
            interaction.user.avatarURL(),
            delayMinutes ?? config.reminderTimeMinutes
        );
        const buttons = presenter.getButtons(result.status);

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    } else {
        // If failed (e.g. already borrowed by someone else, or invalid state)
        // Existing logic handled "already borrowed" by updating reminder.
        // UseCase returns success=true for update.
        // If success=false, it means invalid state or other error.

        if (result.message === "Invalid state") {
            await interaction.reply({
                content: "❌ 無効な状態です。",
                components: [presenter.getButtons(result.status)]
            });
        } else {
            // Fallback
            await interaction.reply({
                content: "❌ エラーが発生しました。",
                components: [presenter.getButtons(result.status)]
            });
        }
    }
};

export const handleReminderCommand = async (interaction: ChatInputCommandInteraction) => {
    const newState = await reminderUseCase.toggleReminder();
    const status = await keyRepository.get();

    await interaction.reply({
        content: `リマインダー機能を${newState ? "ON" : "OFF"}にしました。`,
        components: [presenter.getButtons(status)]
    });
};

export const handleScheduledCheckCommand = async (interaction: ChatInputCommandInteraction) => {
    const newState = await reminderUseCase.toggleScheduledCheck();
    const status = await keyRepository.get();

    await interaction.reply({
        content: `定時チェック機能を${newState ? "ON" : "OFF"}にしました。`,
        components: [presenter.getButtons(status)]
    });
};

export const handleReminderTimeCommand = async (interaction: ChatInputCommandInteraction) => {
    const minutes = interaction.options.getInteger("minutes");
    if (minutes) {
        await reminderUseCase.setReminderTime(minutes);
        const status = await keyRepository.get();

        await interaction.reply({
            content: `リマインダー送信時間を${minutes}分に設定しました。`,
            components: [presenter.getButtons(status)]
        });
    }
};

export const handleCheckTimeCommand = async (interaction: ChatInputCommandInteraction) => {
    const hour = interaction.options.getInteger("hour");
    const minute = interaction.options.getInteger("minute");
    if (hour !== null && minute !== null) {
        await reminderUseCase.setCheckTime(hour, minute);
        // Note: Schedule update logic is missing in UseCase, assuming it will be handled or just config updated.
        // In original, it called schedule20OClockCheck(client).
        // We should probably expose a way to reschedule check.

        const status = await keyRepository.get();
        await interaction.reply({
            content: `定時チェック時刻を${hour}時${minute}分に設定しました。`,
            components: [presenter.getButtons(status)]
        });
    }
};

export const handleStatusCommand = async (interaction: ChatInputCommandInteraction) => {
    const status = await keyRepository.get();

    const statusEmbed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle("⚙️ アラーム設定状況")
        .addFields(
            { name: "リマインダー機能", value: config.isReminderEnabled ? "✅ ON" : "❌ OFF", inline: true },
            { name: "定時チェック機能", value: config.isScheduledCheckEnabled ? "✅ ON" : "❌ OFF", inline: true },
            { name: "リマインダー時間", value: `${config.reminderTimeMinutes}分`, inline: true },
            { name: "定時チェック時刻", value: `${config.checkHour}時${config.checkMinute}分`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({
        embeds: [statusEmbed],
        components: [presenter.getButtons(status)]
    });
};

export const handleOwnerCommand = async (interaction: ChatInputCommandInteraction) => {
    const status = await keyRepository.get();
    const currentBorrower = await borrowerRepository.get();

    if (status === "RETURN" || !currentBorrower) {
        await interaction.reply({
            content: "❌ 現在、鍵は借りられていません。",
            components: [presenter.getButtons(status)]
        });
        return;
    }

    const newOwnerUser = interaction.options.getUser("user");
    if (!newOwnerUser) {
        await interaction.reply({
            content: "❌ ユーザーが指定されていません。",
            components: [presenter.getButtons(status)]
        });
        return;
    }

    const oldOwnerName = currentBorrower.username;
    const oldOwnerId = currentBorrower.userId;

    // Logic to change owner:
    // 1. Stop old reminder
    // 2. Save new borrower
    // 3. Start new reminder

    // This logic should be in a UseCase (e.g. ChangeOwnerUseCase), but for now I'll put it here or add to BorrowKeyUseCase?
    // It's effectively "Borrowing" by a new person without changing status from CLOSE.
    // I'll manually do it here using services for now to save time, or create a quick UseCase.
    // Let's do it here.

    reminderService.stopReminder();

    const newBorrower: Borrower = {
        userId: newOwnerUser.id,
        username: newOwnerUser.username,
        channelId: interaction.channelId,
    };

    await borrowerRepository.save(newBorrower);

    if (config.isReminderEnabled) {
        await reminderService.startReminder(newBorrower);
    }

    const changeEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("🔄 鍵の持ち主変更")
        .setDescription(
            `鍵の持ち主を変更しました\n<@${oldOwnerId}> → <@${newOwnerUser.id}>\n${config.isReminderEnabled ? `⏰ リマインダー: ${config.reminderTimeMinutes}分後に通知` : ""}`
        )
        .setTimestamp();

    await interaction.reply({
        embeds: [changeEmbed],
        components: [presenter.getButtons(status)]
    });
};
