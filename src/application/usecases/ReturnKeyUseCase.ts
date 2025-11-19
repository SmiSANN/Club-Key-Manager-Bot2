import { IKeyRepository } from "../../domain/repositories/IKeyRepository";
import { IBorrowerRepository } from "../../domain/repositories/IBorrowerRepository";
import { ReminderService } from "../services/ReminderService";
import { returnKey } from "../../domain/services/KeyService";
import { KeyStatus } from "../../domain/models/KeyStatus";

export class ReturnKeyUseCase {
    constructor(
        private keyRepository: IKeyRepository,
        private borrowerRepository: IBorrowerRepository,
        private reminderService: ReminderService
    ) { }

    async execute(): Promise<{ success: boolean; status: KeyStatus }> {
        const currentStatus = await this.keyRepository.get();
        const newStatus = returnKey(currentStatus);

        if (newStatus !== currentStatus) {
            await this.keyRepository.save(newStatus);
            await this.borrowerRepository.clear();
            this.reminderService.stopReminder();
            return { success: true, status: newStatus };
        }

        return { success: false, status: currentStatus };
    }
}
