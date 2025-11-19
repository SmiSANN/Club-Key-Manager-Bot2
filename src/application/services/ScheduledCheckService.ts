import { Client, TextChannel, EmbedBuilder, Colors } from "discord.js";
import { Config } from "../../infrastructure/config/Config";
import { DiscordPresenter } from "../../infrastructure/discord/DiscordPresenter";
import { IBorrowerRepository } from "../../domain/repositories/IBorrowerRepository";
import { IKeyRepository } from "../../domain/repositories/IKeyRepository";

export class ScheduledCheckService {
    private timerId: NodeJS.Timeout | null = null;

    constructor(
        private client: Client,
        private config: Config,
        private borrowerRepository: IBorrowerRepository,
        private keyRepository: IKeyRepository,
        private presenter: DiscordPresenter
    ) { }

    public start(): void {
        this.scheduleNext();
    }

    public stop(): void {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    private scheduleNext(): void {
        const msUntilCheck = this.getMillisecondsUntilCheck();
        console.log(`Next scheduled check in ${Math.round(msUntilCheck / 1000 / 60)} minutes.`);

        this.timerId = setTimeout(() => {
            this.performCheck();
            this.scheduleNext();
        }, msUntilCheck);
    }

    private getMillisecondsUntilCheck(): number {
        const now = new Date();
        const target = new Date();
        target.setHours(this.config.checkHour, this.config.checkMinute, 0, 0);

        if (now.getTime() >= target.getTime()) {
            target.setDate(target.getDate() + 1);
        }

        return target.getTime() - now.getTime();
    }

    private async performCheck(): Promise<void> {
        if (!this.config.isScheduledCheckEnabled) {
            console.log("Scheduled check is disabled. Skipping.");
            return;
        }

        const keyStatus = await this.keyRepository.get();
        const borrower = await this.borrowerRepository.get();

        if (keyStatus !== "RETURN" && borrower) {
            try {
                const channel = await this.client.channels.fetch(borrower.channelId) as TextChannel;
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor(Colors.Gold)
                        .setTitle("⏰️鍵返却確認")
                        .setDescription(
                            `<@${borrower.userId}> さん、定時になりましたが鍵がまだ返却されていません。\nemail：jm-hcgakusei@stf.teu.ac.jp`
                        )
                        .setTimestamp();

                    const buttons = this.presenter.getButtons(keyStatus);

                    await channel.send({
                        content: `<@${borrower.userId}>`,
                        embeds: [embed],
                        components: [buttons]
                    });

                    console.log(`Scheduled check: Reminder sent to ${borrower.username}`);
                }
            } catch (error) {
                console.error("Failed to send scheduled check reminder:", error);
            }
        } else {
            console.log("Scheduled check: Key is returned or no borrower info.");
        }
    }
}
