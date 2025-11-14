import { Client, GatewayIntentBits } from "discord.js";

/**
 * Discordクライアントを作成し、必要な権限（Intents）を設定
 */
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // サーバー情報の取得
    GatewayIntentBits.GuildMessages, // メッセージの送受信
    GatewayIntentBits.MessageContent, // メッセージ内容の取得
    GatewayIntentBits.GuildMembers, // メンバー情報の取得
  ],
});
