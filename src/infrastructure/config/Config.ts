import fs from "fs";
import path from "path";

interface Settings {
    LogChannel: string;
    Token: string;
    ModeConsole?: string | boolean;
    ReminderTimeMinutes?: number;
    checkHour?: number;
    checkMinute?: number;
}

export class Config {
    private static instance: Config;

    public readonly logChannelId: string;
    public readonly token: string;
    public readonly isConsoleMode: boolean;

    // Runtime mutable settings
    public reminderTimeMinutes: number;
    public checkHour: number;
    public checkMinute: number;
    public isReminderEnabled: boolean = true;
    public isScheduledCheckEnabled: boolean = true;

    private constructor() {
        let settings: Settings;
        try {
            const settingsPath = path.resolve(process.cwd(), "src/settings.json");
            settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        } catch (err) {
            console.error(
                "設定ファイル settings.json の読み込みまたはパースに失敗しました。\n" +
                "エラー内容: " + err + "\n" +
                "settings.json が存在しない場合は settings.json.sample をコピーして作成してください。"
            );
            process.exit(1);
        }

        this.logChannelId = settings.LogChannel;
        this.token = settings.Token;
        this.isConsoleMode = this.string2boolean(settings.ModeConsole);
        this.reminderTimeMinutes = settings.ReminderTimeMinutes || 60;
        this.checkHour = settings.checkHour || 20;
        this.checkMinute = settings.checkMinute || 0;
    }

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    private string2boolean(value: string | boolean | null | undefined): boolean {
        if (typeof value === "boolean") {
            return value;
        }
        if (!value) {
            return false;
        }
        return value.toLowerCase() === "true" || value === "1";
    }
}
