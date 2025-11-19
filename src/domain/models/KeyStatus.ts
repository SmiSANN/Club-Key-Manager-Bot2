export type KeyStatus = "RETURN" | "CLOSE" | "OPEN";

export type OperKey = (status: KeyStatus) => KeyStatus;
