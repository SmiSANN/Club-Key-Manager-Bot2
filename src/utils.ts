import { Key } from "./types";

/**
 * 文字列をboolean型に変換する関数
 * "true"または"1"の場合にtrueを返し、それ以外はfalseを返す
 * 
 * @param value - 変換する文字列
 * @returns boolean値
 */
export const string2boolean = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }
  return value.toLowerCase() === "true" || value === "1";
};

/**
 * 型ガード関数：文字列がKey型かどうかを確認
 * TypeScriptの型安全性を保つために使用
 * 
 * @param value - チェックする文字列
 * @returns valueがKey型の値である場合true
 */
export const isKey = (value: string): value is Key => {
  return (
    value === "BORROW" ||
    value === "OPEN" ||
    value === "CLOSE" ||
    value === "RETURN"
  );
};
