import { Key, OperKey } from "../types";
import { modeConsole } from "../config";

// 鍵を借りる操作の関数
// 返却済み（RETURN）の状態でのみ借りることができ、借りた状態（BORROW）になる
export const borrowKey: OperKey = (status: Key) => {
  return status === "RETURN" ? "BORROW" : status;
};

// 鍵で部屋を開ける操作の関数
// 借りている（BORROW）または閉めている（CLOSE）状態で開けることができる
// 操作卓モードの場合は開けることができない
export const openKey: OperKey = (status: Key) => {
  return (status === "BORROW" || status === "CLOSE") && !modeConsole
    ? "OPEN"
    : status;
};

// 鍵で部屋を閉める操作の関数
// 開いている（OPEN）状態でのみ閉めることができる
// 操作卓モードの場合は閉めることができない
export const closeKey: OperKey = (status: Key) => {
  return status === "OPEN" && !modeConsole ? "CLOSE" : status;
};

// 鍵を返却する操作の関数
// 借りている（BORROW）または閉めている（CLOSE）状態で返却できる
export const returnKey: OperKey = (status: Key) => {
  return status === "BORROW" || status === "CLOSE" ? "RETURN" : status;
};
