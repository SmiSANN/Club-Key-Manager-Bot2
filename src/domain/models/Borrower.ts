export interface Borrower {
    userId: string;
    username: string;
    channelId: string;
    timerId?: NodeJS.Timeout; // Note: This might be infrastructure specific, but keeping it here for now as it's part of the state. 
    // Ideally, the timer itself shouldn't be serialized, but the concept of an active reminder might be.
    // For pure domain, we might just track 'reminderScheduledAt'. 
    // But to keep migration simple, let's keep the structure similar to what was there, 
    // but maybe we don't need to store the actual Timeout object in the domain model if we persist it?
    // Actually, the Timeout object is runtime state.
}
