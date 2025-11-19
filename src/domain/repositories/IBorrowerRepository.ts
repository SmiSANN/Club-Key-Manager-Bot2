import { Borrower } from "../models/Borrower";

export interface IBorrowerRepository {
    save(borrower: Borrower): Promise<void>;
    get(): Promise<Borrower | null>;
    clear(): Promise<void>;
}
