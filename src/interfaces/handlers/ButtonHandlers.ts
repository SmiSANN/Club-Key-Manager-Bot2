import { ButtonInteraction } from "discord.js";
import {
    borrowKeyUseCase,
    returnKeyUseCase,
    keyOperationUseCase,
    reminderUseCase,
    presenter,
    config,
    keyRepository
} from "../../container";
import { Borrower } from "../../domain/models/Borrower";

export const handleButtonInteraction = async (interaction: ButtonInteraction) => {
    const customId = interaction.customId;

    switch (customId) {
        case "BORROW_KEY":
            // Borrowing via button usually implies default settings
            const borrower: Borrower = {
                userId: interaction.user.id,
                username: interaction.user.username,
                channelId: interaction.channelId,
            };
            const borrowResult = await borrowKeyUseCase.execute(borrower);
            if (borrowResult.success) {
                const embed = presenter.createBorrowEmbed(
                    borrower.username,
                    interaction.user.avatarURL(),
                    config.reminderTimeMinutes
                );
                await interaction.reply({
                    embeds: [embed],
                    components: [presenter.getButtons(borrowResult.status)]
                });
            } else {
                await interaction.reply({
                    content: "❌ 借りることができませんでした。",
                    components: [presenter.getButtons(borrowResult.status)],
                    ephemeral: true
                });
            }
            break;

        case "RETURN":
            const returnResult = await returnKeyUseCase.execute();
            if (returnResult.success) {
                await interaction.reply({
                    content: "鍵を返しました。",
                    components: [presenter.getButtons(returnResult.status)]
                });
            } else {
                await interaction.reply({
                    content: "❌ 返すことができませんでした。",
                    components: [presenter.getButtons(returnResult.status)],
                    ephemeral: true
                });
            }
            break;

        case "OPEN":
            const openResult = await keyOperationUseCase.open();
            if (openResult.success) {
                await interaction.reply({
                    content: "鍵を開けました。",
                    components: [presenter.getButtons(openResult.status)]
                });
            } else {
                await interaction.reply({
                    content: "❌ 開けることができませんでした。",
                    components: [presenter.getButtons(openResult.status)],
                    ephemeral: true
                });
            }
            break;

        case "CLOSE":
            const closeResult = await keyOperationUseCase.close();
            if (closeResult.success) {
                await interaction.reply({
                    content: "鍵を閉めました。",
                    components: [presenter.getButtons(closeResult.status)]
                });
            } else {
                await interaction.reply({
                    content: "❌ 閉めることができませんでした。",
                    components: [presenter.getButtons(closeResult.status)],
                    ephemeral: true
                });
            }
            break;

        case "TOGGLE_REMINDER":
            const newState = await reminderUseCase.toggleReminder();
            const status = await keyRepository.get();
            await interaction.reply({
                content: `リマインダー機能を${newState ? "ON" : "OFF"}にしました。`,
                components: [presenter.getButtons(status)]
            });
            break;
    }
};
