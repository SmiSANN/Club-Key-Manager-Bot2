import { IKeyRepository } from "../../domain/repositories/IKeyRepository";
import { IBorrowerRepository } from "../../domain/repositories/IBorrowerRepository";
import { ReminderService } from "../services/ReminderService";
import { borrowKey } from "../../domain/services/KeyService";
import { Borrower } from "../../domain/models/Borrower";
import { KeyStatus } from "../../domain/models/KeyStatus";

export class BorrowKeyUseCase {
    constructor(
        private keyRepository: IKeyRepository,
        private borrowerRepository: IBorrowerRepository,
        private reminderService: ReminderService
    ) { }

    async execute(borrower: Borrower, delayMinutes?: number): Promise<{ success: boolean; status: KeyStatus; message?: string }> {
        const currentStatus = await this.keyRepository.get();
        const newStatus = borrowKey(currentStatus);

        if (newStatus === currentStatus && currentStatus !== "RETURN") {
            // Already borrowed or invalid state
            // If already borrowed by someone else?
            // Existing logic: if RETURN, can borrow.
            // If OPEN/CLOSE, check if it's the same borrower?
            // Existing logic allows updating reminder if already borrowed.

            const currentBorrower = await this.borrowerRepository.get();
            if (currentBorrower) {
                // Update reminder
                await this.reminderService.startReminder(currentBorrower, delayMinutes);
                return { success: true, status: currentStatus, message: "Reminder updated" };
            }

            return { success: false, status: currentStatus, message: "Invalid state" };
        }

        if (newStatus !== currentStatus) {
            await this.keyRepository.save(newStatus);
            await this.borrowerRepository.save(borrower);
            await this.reminderService.startReminder(borrower, delayMinutes);
            return { success: true, status: newStatus };
        }

        return { success: false, status: currentStatus };
    }
}
