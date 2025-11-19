import { Client, GatewayIntentBits, Interaction } from "discord.js";
import { Config } from "../config/Config";

export class DiscordBot {
    public readonly client: Client;
    private config: Config;

    constructor() {
        this.config = Config.getInstance();
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
        });
    }

    public async login(): Promise<void> {
        await this.client.login(this.config.token);
    }

    public onInteractionCreate(handler: (interaction: Interaction) => Promise<void>): void {
        this.client.on("interactionCreate", handler);
    }

    public onReady(handler: () => void): void {
        this.client.once("ready", handler);
    }
}
