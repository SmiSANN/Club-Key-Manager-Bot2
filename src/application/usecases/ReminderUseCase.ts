import { Config } from "../../infrastructure/config/Config";
import { ReminderService } from "../services/ReminderService";
import { IBorrowerRepository } from "../../domain/repositories/IBorrowerRepository";

export class ReminderUseCase {
    constructor(
        private config: Config,
        private reminderService: ReminderService,
        private borrowerRepository: IBorrowerRepository
    ) { }

    async toggleReminder(): Promise<boolean> {
        this.config.isReminderEnabled = !this.config.isReminderEnabled;

        // If toggled ON, and there is a borrower, reschedule
        // If toggled OFF, stop reminder (handled by service check or explicit stop)
        const borrower = await this.borrowerRepository.get();
        if (borrower) {
            if (this.config.isReminderEnabled) {
                await this.reminderService.reschedule(borrower);
            } else {
                this.reminderService.stopReminder();
            }
        }

        return this.config.isReminderEnabled;
    }

    async setReminderTime(minutes: number): Promise<void> {
        this.config.reminderTimeMinutes = minutes;

        const borrower = await this.borrowerRepository.get();
        if (borrower && this.config.isReminderEnabled) {
            await this.reminderService.reschedule(borrower);
        }
    }

    async toggleScheduledCheck(): Promise<boolean> {
        this.config.isScheduledCheckEnabled = !this.config.isScheduledCheckEnabled;
        return this.config.isScheduledCheckEnabled;
    }

    async setCheckTime(hour: number, minute: number): Promise<void> {
        this.config.checkHour = hour;
        this.config.checkMinute = minute;
        // Note: Rescheduling the check itself is needed. 
        // The ScheduledCheck logic is currently in a separate service/file.
        // I should probably move it to Application Layer too.
    }
}
