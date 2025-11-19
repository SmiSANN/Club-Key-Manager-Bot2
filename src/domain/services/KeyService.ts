import { KeyStatus, OperKey } from "../models/KeyStatus";

// 鍵を借りる操作
// 返却済み（RETURN）の状態でのみ借りることができ、閉めた状態（CLOSE）になる
export const borrowKey: OperKey = (status: KeyStatus) => {
    return status === "RETURN" ? "CLOSE" : status;
};

// 鍵で部屋を開ける操作
// 閉めている（CLOSE）状態で開けることができる
// 操作卓モードのチェックはここではなく、呼び出し元（UseCaseまたはConfig注入）で行うべきだが、
// 純粋な状態遷移としては「CLOSEならOPENにできる」が基本。
// ただし、物理的な制約（操作卓モード）をドメインルールとするなら、ここに条件を入れる必要がある。
// 今回はシンプルにするため、状態遷移ロジックのみ記述し、モード判定はUseCase層で制御するか、
// KeyServiceにモードを渡す形にする。
// 既存ロジックを尊重し、モード依存を排除した純粋な遷移を定義する。
export const openKey: OperKey = (status: KeyStatus) => {
    return status === "CLOSE" ? "OPEN" : status;
};

// 鍵で部屋を閉める操作
// 開いている（OPEN）状態でのみ閉めることができる
export const closeKey: OperKey = (status: KeyStatus) => {
    return status === "OPEN" ? "CLOSE" : status;
};

// 鍵を返却する操作
// 閉めている（CLOSE）状態で返却できる
export const returnKey: OperKey = (status: KeyStatus) => {
    return status === "CLOSE" ? "RETURN" : status;
};
