// 鍵の状態を表す型定義
// BORROW: 借りている状態
// OPEN: 部屋を開けている状態
// CLOSE: 部屋を閉めている状態（まだ鍵は返却していない）
// RETURN: 返却済みの状態
export type Key = "BORROW" | "OPEN" | "CLOSE" | "RETURN";

// 鍵を借りたユーザーの情報を保存する型定義
export type BorrowerInfo = {
  userId: string; // ユーザーのDiscord ID
  username: string; // ユーザー名
  channelId: string; // メッセージを送信するチャンネルのID
  timerId: ReturnType<typeof setTimeout> | null; // リマインダータイマーのID
  borrowedAt: number; // 鍵を借りた時刻（ミリ秒）
  reminderCount: number; // リマインダーの送信回数
};

// 鍵への操作を表す関数の型定義
// 現在の状態を受け取り、操作後の新しい状態を返す
export type OperKey = (status: Key) => Key;

// Activityの型定義（ボットのアクティビティ状態）
export type Activity = {
  name: string; // アクティビティの名前（例：「部室」）
};

// Presenceの型定義（ボットのオンライン状態とアクティビティ）
export type Presence = {
  status: import("discord.js").PresenceStatusData; // ステータス（オンライン、退席中、非表示など）
  activities: Activity[]; // アクティビティのリスト
};
