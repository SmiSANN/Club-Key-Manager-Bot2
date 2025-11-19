import fs from "fs/promises";
import path from "path";
import { IBorrowerRepository } from "../../domain/repositories/IBorrowerRepository";
import { Borrower } from "../../domain/models/Borrower";

interface BorrowerData {
    userId: string;
    username: string;
    channelId: string;
    borrowedAt: number; // For restoring state if needed, though domain model might need update if we want to be strict
}

export class FileBorrowerRepository implements IBorrowerRepository {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.resolve(process.cwd(), "borrower.json");
    }

    async save(borrower: Borrower): Promise<void> {
        const data: BorrowerData = {
            userId: borrower.userId,
            username: borrower.username,
            channelId: borrower.channelId,
            borrowedAt: Date.now(), // Simple timestamp for now
        };
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }

    async get(): Promise<Borrower | null> {
        try {
            const content = await fs.readFile(this.filePath, "utf8");
            const data: BorrowerData = JSON.parse(content);
            return {
                userId: data.userId,
                username: data.username,
                channelId: data.channelId,
                // timerId is not persisted, will need to be rescheduled by application logic on startup
            };
        } catch (error) {
            // File not found or invalid
            return null;
        }
    }

    async clear(): Promise<void> {
        try {
            await fs.unlink(this.filePath);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    }
}
