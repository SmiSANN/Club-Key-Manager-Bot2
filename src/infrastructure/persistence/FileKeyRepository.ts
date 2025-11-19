import fs from "fs/promises";
import path from "path";
import { IKeyRepository } from "../../domain/repositories/IKeyRepository";
import { KeyStatus } from "../../domain/models/KeyStatus";

interface KeyData {
    status: KeyStatus;
}

export class FileKeyRepository implements IKeyRepository {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.resolve(process.cwd(), "key_status.json");
    }

    async save(status: KeyStatus): Promise<void> {
        const data: KeyData = { status };
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }

    async get(): Promise<KeyStatus> {
        try {
            const content = await fs.readFile(this.filePath, "utf8");
            const data: KeyData = JSON.parse(content);
            return data.status;
        } catch (error) {
            return "RETURN"; // Default to RETURN if file doesn't exist
        }
    }
}
