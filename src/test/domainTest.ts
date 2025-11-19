import { borrowKey, openKey, closeKey, returnKey } from "../domain/services/KeyService";
import { KeyStatus } from "../domain/models/KeyStatus";

const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`❌ ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ ${message}`);
    }
};

console.log("Testing Domain Services...");

// Test Borrow
assert(borrowKey("RETURN") === "CLOSE", "borrowKey: RETURN -> CLOSE");
assert(borrowKey("CLOSE") === "CLOSE", "borrowKey: CLOSE -> CLOSE (No change)");
assert(borrowKey("OPEN") === "OPEN", "borrowKey: OPEN -> OPEN (No change)");

// Test Open
assert(openKey("CLOSE") === "OPEN", "openKey: CLOSE -> OPEN");
assert(openKey("OPEN") === "OPEN", "openKey: OPEN -> OPEN (No change)");
assert(openKey("RETURN") === "RETURN", "openKey: RETURN -> RETURN (No change)");

// Test Close
assert(closeKey("OPEN") === "CLOSE", "closeKey: OPEN -> CLOSE");
assert(closeKey("CLOSE") === "CLOSE", "closeKey: CLOSE -> CLOSE (No change)");
assert(closeKey("RETURN") === "RETURN", "closeKey: RETURN -> RETURN (No change)");

// Test Return
assert(returnKey("CLOSE") === "RETURN", "returnKey: CLOSE -> RETURN");
assert(returnKey("OPEN") === "OPEN", "returnKey: OPEN -> OPEN (Cannot return while OPEN)");
assert(returnKey("RETURN") === "RETURN", "returnKey: RETURN -> RETURN (No change)");

console.log("All Domain Tests Passed!");
