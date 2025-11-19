import { IKeyRepository } from "../../domain/repositories/IKeyRepository";
import { openKey, closeKey } from "../../domain/services/KeyService";
import { KeyStatus } from "../../domain/models/KeyStatus";
import { Config } from "../../infrastructure/config/Config";

export class KeyOperationUseCase {
    constructor(
        private keyRepository: IKeyRepository,
        private config: Config
    ) { }

    async open(): Promise<{ success: boolean; status: KeyStatus }> {
        if (this.config.isConsoleMode) {
            return { success: false, status: await this.keyRepository.get() };
        }

        const currentStatus = await this.keyRepository.get();
        const newStatus = openKey(currentStatus);

        if (newStatus !== currentStatus) {
            await this.keyRepository.save(newStatus);
            return { success: true, status: newStatus };
        }

        return { success: false, status: currentStatus };
    }

    async close(): Promise<{ success: boolean; status: KeyStatus }> {
        if (this.config.isConsoleMode) {
            return { success: false, status: await this.keyRepository.get() };
        }

        const currentStatus = await this.keyRepository.get();
        const newStatus = closeKey(currentStatus);

        if (newStatus !== currentStatus) {
            await this.keyRepository.save(newStatus);
            return { success: true, status: newStatus };
        }

        return { success: false, status: currentStatus };
    }
}
