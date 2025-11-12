import { Key, OperKey } from "../types";
import { mode_console } from "../config";

// 鍵を借りる操作の関数
// 返却済み（RETURN）の状態でのみ借りることができ、借りた状態（BORROW）になる
export const borrow_key: OperKey = (status: Key) => {
  return status === "RETURN" ? "BORROW" : status;
};

// 鍵で部屋を開ける操作の関数
// 借りている（BORROW）または閉めている（CLOSE）状態で開けることができる
// 操作卓モードの場合は開けることができない
export const open_key: OperKey = (status: Key) => {
  return (status === "BORROW" || status === "CLOSE") && !mode_console
    ? "OPEN"
    : status;
};

// 鍵で部屋を閉める操作の関数
// 開いている（OPEN）状態でのみ閉めることができる
// 操作卓モードの場合は閉めることができない
export const close_key: OperKey = (status: Key) => {
  return status === "OPEN" && !mode_console ? "CLOSE" : status;
};

// 鍵を返却する操作の関数
// 借りている（BORROW）または閉めている（CLOSE）状態で返却できる
export const return_key: OperKey = (status: Key) => {
  return status === "BORROW" || status === "CLOSE" ? "RETURN" : status;
};
