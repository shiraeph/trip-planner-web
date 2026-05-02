const STORAGE_KEY = "userId";

function generateUuid(): string {
    return crypto.randomUUID();
}

export function getOrCreateUserId(): string {
    try {
        let id = localStorage.getItem(STORAGE_KEY);
        if (!id) {
            id = generateUuid();
            localStorage.setItem(STORAGE_KEY, id);
        }
        return id;
    } catch {
        return generateUuid();
    }
}
