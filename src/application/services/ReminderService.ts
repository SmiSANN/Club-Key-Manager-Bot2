import { Client, TextChannel } from "discord.js";
import { Config } from "../../infrastructure/config/Config";
import { DiscordPresenter } from "../../infrastructure/discord/DiscordPresenter";
import { IBorrowerRepository } from "../../domain/repositories/IBorrowerRepository";
import { IKeyRepository } from "../../domain/repositories/IKeyRepository";
import { Borrower } from "../../domain/models/Borrower";

export class ReminderService {
    private timerId: NodeJS.Timeout | null = null;
    private reminderCount: number = 0;

    constructor(
        private client: Client,
        private config: Config,
        private borrowerRepository: IBorrowerRepository,
        private keyRepository: IKeyRepository,
        private presenter: DiscordPresenter
    ) { }

    public async startReminder(borrower: Borrower, delayMinutes?: number): Promise<void> {
        this.stopReminder();
        this.reminderCount = 0;

        const minutes = delayMinutes ?? this.config.reminderTimeMinutes;
        const delayMs = minutes * 60 * 1000;

        console.log(`Starting reminder for ${borrower.username} in ${minutes} minutes.`);

        this.timerId = setTimeout(() => {
            this.sendReminder(borrower);
        }, delayMs);
    }

    public stopReminder(): void {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.reminderCount = 0;
    }

    public async reschedule(borrower: Borrower): Promise<void> {
        this.stopReminder();
        if (this.config.isReminderEnabled) {
            this.startReminder(borrower);
        }
    }

    private async sendReminder(borrower: Borrower): Promise<void> {
        if (!this.config.isReminderEnabled) return;

        this.reminderCount++;
        const minutes = this.config.reminderTimeMinutes;

        try {
            const channel = await this.client.channels.fetch(borrower.channelId) as TextChannel;
            if (channel) {
                const embed = this.presenter.createReminderEmbed(borrower.userId, this.reminderCount, minutes);
                const keyStatus = await this.keyRepository.get();
                const buttons = this.presenter.getButtons(keyStatus);

                await channel.send({
                    content: `<@${borrower.userId}>`,
                    embeds: [embed],
                    components: [buttons]
                });

                console.log(`Reminder sent to ${borrower.username} (${this.reminderCount})`);

                // Schedule next
                this.timerId = setTimeout(() => {
                    this.sendReminder(borrower);
                }, minutes * 60 * 1000);
            }
        } catch (error) {
            console.error("Failed to send reminder:", error);
        }
    }
}
