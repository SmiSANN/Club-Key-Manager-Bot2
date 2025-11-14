import { Key } from "./types";

/**
 * ミリ秒を分に変換する関数
 * @param ms - ミリ秒
 * @returns 分
 */
export const msToMinutes = (ms: number): number => {
  return ms / 1000 / 60;
};

/**
 * 分をミリ秒に変換する関数
 * @param minutes - 分
 * @returns ミリ秒
 */
export const minutesToMs = (minutes: number): number => {
  return minutes * 60 * 1000;
};

/**
 * 文字列またはbooleanをboolean型に変換する関数
 * "true"または"1"の場合にtrueを返し、それ以外はfalseを返す
 * 既にboolean型の場合はそのまま返す
 * 
 * @param value - 変換する文字列またはboolean
 * @returns boolean値
 */
export const string2boolean = (value: string | boolean | null | undefined): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
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
