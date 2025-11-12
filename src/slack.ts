// axiosライブラリをインポート（HTTP通信用）
import axios from "axios";

/**
 * Slackにメッセージを送信する関数
 * カリー化されており、メッセージとWebhook URLを別々に渡すことができる
 * 
 * @param message - Slackに送信するメッセージ本文
 * @returns Webhook URLを受け取り、実際にメッセージを送信する非同期関数
 * 
 * @example
 * // 使い方
 * const sendMessage = messagingSlack("こんにちは");
 * await sendMessage("https://hooks.slack.com/services/YOUR/WEBHOOK/URL");
 */
export const messagingSlack = (message: string) => {
  // Slack Webhook API用のメッセージデータを作成
  const messageData = { text: message };
  
  // Webhook URLを受け取って実際に送信する関数を返す
  return async (url: string) => {
    await axios
      .post(url, JSON.stringify(messageData)) // POSTリクエストでメッセージを送信
      .then((res) => {
        return res; // 成功時はレスポンスを返す
      })
      .catch((e) => {
        return e; // エラー時はエラーオブジェクトを返す
      });
  };
};

/**
 * Slackに送信するメッセージを作成する関数
 * カリー化されており、誰が何をしたかを段階的に組み立てる
 * 
 * @param who - 操作を行ったユーザー名
 * @returns 操作内容を受け取り、完全なメッセージを返す関数
 * 
 * @example
 * // 使い方
 * const message = createMessage("太郎")("借りました");
 * // 結果: "太郎が鍵を借りました"
 */
export const createMessage = (who: string) => {
  return (what: string) => {
    return `${who}が鍵を${what}`;
  };
};
