import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Session } from '../models/Session';
import { DailyLog } from '../models/Nutrition';

const DB_NAME = 'fitna-db';
const DB_VERSION = 2; // Incremented for DailyLogs
const STORE_SESSIONS = 'sessions';
const STORE_DAILY_LOGS = 'daily_logs';

interface FitnaDB extends DBSchema {
    sessions: {
        key: string;
        value: Session;
        indexes: {
            'by-startTime': number;
            'by-isSynced': number;
        };
    };
    daily_logs: {
        key: string;
        value: DailyLog;
    };
}

let dbPromise: Promise<IDBPDatabase<FitnaDB>> | null = null;

if (typeof window !== 'undefined') {
    dbPromise = openDB<FitnaDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1 || !db.objectStoreNames.contains(STORE_SESSIONS)) {
                const store = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
                store.createIndex('by-startTime', 'startTime');
                store.createIndex('by-isSynced', 'isSynced');
            }
            if (oldVersion < 2 || !db.objectStoreNames.contains(STORE_DAILY_LOGS)) {
                db.createObjectStore(STORE_DAILY_LOGS, { keyPath: 'date' });
            }
        },
    });
}

export const dbStore = {
    /**
     * Save or update a session in IndexedDB
     */
    async saveSession(session: Session): Promise<void> {
        if (!dbPromise) return;
        const db = await dbPromise;
        await db.put(STORE_SESSIONS, session);
    },

    /**
     * Get a specific session by ID
     */
    async getSession(id: string): Promise<Session | undefined> {
        if (!dbPromise) return undefined;
        const db = await dbPromise;
        return await db.get(STORE_SESSIONS, id);
    },

    /**
     * Delete a session by ID
     */
    async deleteSession(id: string): Promise<void> {
        if (!dbPromise) return;
        const db = await dbPromise;
        await db.delete(STORE_SESSIONS, id);
    },

    /**
     * Get all sessions sorted by startTime descending (newest first)
     */
    async getAllSessions(): Promise<Session[]> {
        if (!dbPromise) return [];
        const db = await dbPromise;
        const tx = db.transaction(STORE_SESSIONS, 'readonly');
        const index = tx.store.index('by-startTime');

        // We want descending, so we open a cursor with 'prev'
        const sessions: Session[] = [];
        let cursor = await index.openCursor(null, 'prev');

        while (cursor) {
            sessions.push(cursor.value);
            cursor = await cursor.continue();
        }

        return sessions;
    },

    /**
     * Get un-synced sessions for background upload
     */
    async getUnsyncedSessions(): Promise<Session[]> {
        if (!dbPromise) return [];
        const db = await dbPromise;
        const tx = db.transaction(STORE_SESSIONS, 'readonly');
        const index = tx.store.index('by-isSynced');

        // Search for 0 since booleans encode as 0/1 in IDB indexes generally
        // Or we strictly look for false if it handles boolean literals mapping
        // We'll trust exact match on 'false' boolean
        const keys = await index.getAllKeys(IDBKeyRange.only(0)); // if indexed as 0/1, or false.
        // It's safer to just getAll and filter if browser index typing gets weird with booleans, 
        // but IDB normally accepts false.
        const all = await db.getAllFromIndex(STORE_SESSIONS, 'by-isSynced', 0);
        return all;
    },

    /**
     * Set a DailyLog (Nutrition & Bodyweight)
     */
    async saveDailyLog(log: DailyLog): Promise<void> {
        if (!dbPromise) return;
        const db = await dbPromise;
        await db.put(STORE_DAILY_LOGS, log);
    },

    /**
     * Get a DailyLog by date string (YYYY-MM-DD)
     */
    async getDailyLog(date: string): Promise<DailyLog | undefined> {
        if (!dbPromise) return undefined;
        const db = await dbPromise;
        return await db.get(STORE_DAILY_LOGS, date);
    }
};
