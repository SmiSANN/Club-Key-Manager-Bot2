    import { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

/**
 * インタラクションからユーザー情報を取得するヘルパー関数
 * @param interaction - ボタンまたはコマンドのインタラクション
 * @returns ユーザー名とアイコンURL
 */
export const getUserInfo = (interaction: ButtonInteraction | ChatInputCommandInteraction) => {
  return {
    username: interaction.user.username,
    userIconUrl: interaction.user.avatarURL()
  };
};