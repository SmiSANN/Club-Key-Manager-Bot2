import { KeyStatus } from "../models/KeyStatus";

export interface IKeyRepository {
    save(status: KeyStatus): Promise<void>;
    get(): Promise<KeyStatus>;
}
