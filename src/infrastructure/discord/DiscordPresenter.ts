import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors, PresenceData } from "discord.js";
import { KeyStatus } from "../../domain/models/KeyStatus";
import { Config } from "../config/Config";

export class DiscordPresenter {
    private config: Config;

    constructor() {
        this.config = Config.getInstance();
    }

    public getButtons(status: KeyStatus): ActionRowBuilder<ButtonBuilder> {
        const isReminderEnabled = this.config.isReminderEnabled;
        const isConsoleMode = this.config.isConsoleMode;

        const borrowButton = new ButtonBuilder()
            .setCustomId("BORROW_KEY")
            .setLabel("借りる")
            .setStyle(ButtonStyle.Success);

        const openButton = new ButtonBuilder()
            .setCustomId("OPEN")
            .setLabel("開ける")
            .setStyle(ButtonStyle.Success);

        const closeButton = new ButtonBuilder()
            .setCustomId("CLOSE")
            .setLabel("閉める")
            .setStyle(ButtonStyle.Danger);

        const returnButton = new ButtonBuilder()
            .setCustomId("RETURN")
            .setLabel("返す")
            .setStyle(ButtonStyle.Danger);

        const reminderButton = new ButtonBuilder()
            .setCustomId("TOGGLE_REMINDER")
            .setLabel("リマインダー")
            .setStyle(isReminderEnabled ? ButtonStyle.Success : ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>();

        switch (status) {
            case "RETURN":
                row.addComponents(borrowButton);
                break;
            case "OPEN":
                row.addComponents(closeButton);
                break;
            case "CLOSE":
                row.addComponents(returnButton);
                if (!isConsoleMode) {
                    row.addComponents(openButton);
                }
                row.addComponents(reminderButton);
                break;
        }

        return row;
    }

    public getPresence(status: KeyStatus): PresenceData {
        switch (status) {
            case "RETURN":
                return { status: "invisible", activities: [] };
            case "OPEN":
                return { status: "online", activities: [{ name: "部室" }] };
            case "CLOSE":
                return { status: "idle", activities: [] };
        }
    }

    public createBorrowEmbed(username: string, userIconUrl: string | null, reminderMinutes: number): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setColor(Colors.Green)
            .setAuthor({ name: username, iconURL: userIconUrl ?? undefined })
            .setTitle("借りました")
            .setTimestamp();

        if (this.config.isReminderEnabled) {
            embed.addFields({ name: "リマインダー", value: `${reminderMinutes}分後`, inline: true });
        } else {
            embed.addFields({ name: "リマインダー", value: "OFF", inline: true });
        }

        return embed;
    }

    public createReminderEmbed(userId: string, count: number, minutes: number): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(Colors.Gold)
            .setTitle(`⌛️返却リマインダー (${count}回目)`)
            .setDescription(
                `<@${userId}> さん、鍵を借りてから${minutes * count}分が経過しました。\n返却を忘れていませんか？`
            )
            .setTimestamp();
    }
}
