import { Config } from "./infrastructure/config/Config";
import { DiscordBot } from "./infrastructure/discord/DiscordBot";
import { DiscordPresenter } from "./infrastructure/discord/DiscordPresenter";
import { FileBorrowerRepository } from "./infrastructure/persistence/FileBorrowerRepository";
import { FileKeyRepository } from "./infrastructure/persistence/FileKeyRepository";
import { ReminderService } from "./application/services/ReminderService";
import { ScheduledCheckService } from "./application/services/ScheduledCheckService";
import { BorrowKeyUseCase } from "./application/usecases/BorrowKeyUseCase";
import { ReturnKeyUseCase } from "./application/usecases/ReturnKeyUseCase";
import { KeyOperationUseCase } from "./application/usecases/KeyOperationUseCase";
import { ReminderUseCase } from "./application/usecases/ReminderUseCase";

// Infrastructure
export const config = Config.getInstance();
export const discordBot = new DiscordBot();
export const presenter = new DiscordPresenter();
export const borrowerRepository = new FileBorrowerRepository();
export const keyRepository = new FileKeyRepository();

// Application Services
export const reminderService = new ReminderService(
    discordBot.client,
    config,
    borrowerRepository,
    keyRepository,
    presenter
);

export const scheduledCheckService = new ScheduledCheckService(
    discordBot.client,
    config,
    borrowerRepository,
    keyRepository,
    presenter
);

// UseCases
export const borrowKeyUseCase = new BorrowKeyUseCase(
    keyRepository,
    borrowerRepository,
    reminderService
);

export const returnKeyUseCase = new ReturnKeyUseCase(
    keyRepository,
    borrowerRepository,
    reminderService
);

export const keyOperationUseCase = new KeyOperationUseCase(
    keyRepository,
    config
);

export const reminderUseCase = new ReminderUseCase(
    config,
    reminderService,
    borrowerRepository
);
