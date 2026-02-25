import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Session } from '../models/Session';
import { DailyLog } from '../models/Nutrition';
import { supabase } from './supabase';

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
     * Save or update a session in IndexedDB and attempt cloud sync
     */
    async saveSession(session: Session): Promise<void> {
        if (!dbPromise) return;
        const db = await dbPromise;
        // Ensure new sessions are queued for sync
        const sessionToSave = { ...session, isSynced: session.isSynced ?? false };
        await db.put(STORE_SESSIONS, sessionToSave);

        // Fire and forget background sync
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                dbStore.syncPendingSessions().catch(console.error);
            }, 1000);
        }
    },

    /**
     * Get a specific session by ID
     */
    async getSession(id: string): Promise<Session | undefined> {
        if (!dbPromise) return undefined;
        const db = await dbPromise;
        return await db.get(STORE_SESSIONS, id);
    },

    async deleteSession(id: string): Promise<void> {
        if (!dbPromise) return;

        // Try to delete from cloud if authenticated and online
        if (typeof window !== 'undefined' && navigator.onLine) {
            try {
                const { data: { session: authSession } } = await supabase.auth.getSession();
                if (authSession?.user) {
                    const { error } = await supabase.from('sessions').delete().eq('id', id).eq('user_id', authSession.user.id);
                    if (error) {
                        console.error("[Sync Engine] Failed to delete session from cloud:", error.message);
                    } else {
                        console.log(`[Sync Engine] Successfully deleted session ${id} from cloud.`);
                    }
                }
            } catch (e) {
                console.error("[Sync Engine] Cloud deletion error:", e);
            }
        }

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
     * Background worker: Push un-synced sessions, logs, and splits to Supabase
     */
    async syncPendingSessions(): Promise<void> {
        if (!dbPromise || typeof navigator !== 'undefined' && !navigator.onLine) return;

        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user) return; // Not logged in, skip sync

        const db = await dbPromise;

        // --- 1. SYNC COMPLETED SESSIONS ---
        const allSessions = await db.getAll(STORE_SESSIONS);
        const toSyncSessions = allSessions.filter(s => s.isSynced === false && s.endTime);

        if (toSyncSessions.length > 0) {
            console.log(`[Sync Engine] Attempting to push ${toSyncSessions.length} sessions to cloud...`);
            const sessionPayloads = toSyncSessions.map(s => ({
                id: s.id,
                user_id: authSession.user.id,
                name: s.name,
                start_time: s.startTime,
                end_time: s.endTime,
                total_paused_ms: s.totalPausedMs || 0,
                activities: s.activities,
                is_synced: true
            }));

            const { error: sessionError } = await supabase.from('sessions').upsert(sessionPayloads, { onConflict: 'id' });
            if (!sessionError) {
                const writeTx = db.transaction(STORE_SESSIONS, 'readwrite');
                for (const s of toSyncSessions) {
                    await writeTx.store.put({ ...s, isSynced: true, userId: authSession.user.id });
                }
                await writeTx.done;
                console.log(`[Sync Engine] Synced ${toSyncSessions.length} sessions.`);
            } else {
                console.error("[Sync Engine] Session sync failed:", sessionError.message);
            }
        }

        // --- 2. SYNC DAILY LOGS ---
        const allLogs = await db.getAll(STORE_DAILY_LOGS);
        const toSyncLogs = allLogs.filter(l => l.isSynced === false);

        if (toSyncLogs.length > 0) {
            console.log(`[Sync Engine] Attempting to push ${toSyncLogs.length} nutrition logs to cloud...`);
            const logPayloads = toSyncLogs.map(l => ({
                date: l.date,
                user_id: authSession.user.id,
                weight: l.bodyweight, // potentially undefined, handled gracefully
                meals: l.meals,
                is_synced: true
            }));

            const { error: logError } = await supabase.from('daily_logs').upsert(logPayloads, { onConflict: 'date' });
            if (!logError) {
                const writeTx = db.transaction(STORE_DAILY_LOGS, 'readwrite');
                for (const l of toSyncLogs) {
                    await writeTx.store.put({ ...l, isSynced: true });
                }
                await writeTx.done;
                console.log(`[Sync Engine] Synced ${toSyncLogs.length} nutrition logs.`);
            } else {
                console.error("[Sync Engine] Daily Logs sync failed:", logError.message);
            }
        }

        // --- 3. SYNC LOCALSTORAGE SPLITS ---
        try {
            const splitPayloads: Record<string, unknown>[] = [];
            // We want to group by the date part: "activeSplit_YYYY-MM-DD"
            // To avoid dupes or missing matched halves, we iterate once and look for "activeSplit_"
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('activeSplit_')) {
                    const datePart = key.replace('activeSplit_', '');
                    const activeSplitValue = localStorage.getItem(key);
                    const customItemsValue = localStorage.getItem(`customSplitItems_${datePart}`);

                    if (activeSplitValue) {
                        splitPayloads.push({
                            week_key: datePart,
                            user_id: authSession.user.id,
                            split_type: activeSplitValue, // store typically saves plain strings
                            custom_items: customItemsValue ? JSON.parse(customItemsValue) : null,
                            is_synced: true,
                            updated_at: new Date().toISOString() // Force updated_at tick
                        });
                    }
                }
            }

            if (splitPayloads.length > 0) {
                console.log(`[Sync Engine] Attempting to push ${splitPayloads.length} programmed splits to cloud...`);
                // Because primary key is (week_key, user_id), onConflict requires declaring the constraint name or both columns.
                // Supabase JS allows omiting onConflict if it's strictly a match of the primary key.
                const { error: splitError } = await supabase.from('splits').upsert(splitPayloads);
                if (!splitError) {
                    console.log(`[Sync Engine] Synced programmed splits.`);
                } else {
                    console.error("[Sync Engine] Splits sync failed:", splitError.message);
                }
            }
        } catch (e) {
            console.error("[Sync Engine] LocalStorage parsing error for splits", e);
        }
    },

    /**
     * Background worker: Pull historic sessions, logs, and splits from Supabase
     * Run this once on fresh logins.
     */
    async pullCloudSessions(): Promise<void> {
        if (!dbPromise || typeof navigator !== 'undefined' && !navigator.onLine) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        console.log("[Sync Engine] Pulling cloud history...");

        // 1. Fetch Sessions
        const { data: sessionData, error: sessionErr } = await supabase.from('sessions').select('*').eq('user_id', session.user.id);
        if (sessionErr) {
            console.error("[Sync Engine] Supabase session pull failed:", sessionErr.message);
        } else if (sessionData && sessionData.length > 0) {
            const db = await dbPromise;
            const writeTx = db.transaction(STORE_SESSIONS, 'readwrite');
            for (const row of sessionData) {
                const localSession: Session = {
                    id: row.id,
                    userId: row.user_id,
                    name: row.name,
                    startTime: Number(row.start_time),
                    endTime: row.end_time ? Number(row.end_time) : undefined,
                    totalPausedMs: Number(row.total_paused_ms),
                    activities: row.activities,
                    isSynced: true
                };
                await writeTx.store.put(localSession);
            }
            await writeTx.done;
            console.log(`[Sync Engine] Hydrated ${sessionData.length} cloud sessions.`);
        }

        // 2. Fetch Daily Logs
        const { data: logData, error: logErr } = await supabase.from('daily_logs').select('*').eq('user_id', session.user.id);
        if (logErr) {
            console.error("[Sync Engine] Supabase logs pull failed:", logErr.message);
        } else if (logData && logData.length > 0) {
            const db = await dbPromise;
            const writeTx = db.transaction(STORE_DAILY_LOGS, 'readwrite');
            for (const row of logData) {
                const localLog: DailyLog = {
                    date: row.date,
                    meals: row.meals,
                    bodyweight: row.weight,
                    goals: { calories: 2500, protein: 180, carbs: 250, fat: 80 }, // Placeholder, can be stored in profile
                    isSynced: true
                };
                await writeTx.store.put(localLog);
            }
            await writeTx.done;
            console.log(`[Sync Engine] Hydrated ${logData.length} nutrition logs.`);
        }

        // 3. Fetch Splits
        const { data: splitData, error: splitErr } = await supabase.from('splits').select('*').eq('user_id', session.user.id);
        if (splitErr) {
            console.error("[Sync Engine] Supabase splits pull failed:", splitErr.message);
        } else if (splitData && splitData.length > 0) {
            for (const row of splitData) {
                // write back to local storage
                localStorage.setItem(`activeSplit_${row.week_key}`, row.split_type);
                if (row.custom_items) {
                    localStorage.setItem(`customSplitItems_${row.week_key}`, JSON.stringify(row.custom_items));
                }
            }
            console.log(`[Sync Engine] Hydrated ${splitData.length} programmed weeks.`);
        }
    },

    /**
     * Clear all local caches (IndexedDB and LocalStorage Fitna keys)
     * Used exclusively for End-to-End Sign Out
     */
    async clearAllLocalData(): Promise<void> {
        // 1. Clear IndexedDB Stores
        if (dbPromise) {
            try {
                const db = await dbPromise;
                const tx = db.transaction([STORE_SESSIONS, STORE_DAILY_LOGS], 'readwrite');
                await tx.objectStore(STORE_SESSIONS).clear();
                await tx.objectStore(STORE_DAILY_LOGS).clear();
                await tx.done;
                console.log("[Sync Engine] Wiped IndexedDB sessions and daily_logs.");
            } catch (e) {
                console.error("[Sync Engine] Failed to wipe IndexedDB:", e);
            }
        }

        // 2. Clear LocalStorage Fitna Keys
        if (typeof window !== 'undefined') {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('activeSplit_') ||
                    key.startsWith('customSplitItems_') ||
                    key.startsWith('1RM_') ||
                    key === 'Bodyweight' ||
                    key === 'Gender' ||
                    key === 'Height' ||
                    key === 'fitna-storage' // Zustand persist key
                )) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`[Sync Engine] Nuked ${keysToRemove.length} LocalStorage keys.`);
        }
    },

    /**
     * Set a DailyLog (Nutrition & Bodyweight)
     */
    async saveDailyLog(log: DailyLog): Promise<void> {
        if (!dbPromise) return;
        const db = await dbPromise;
        const logToSave = { ...log, isSynced: false }; // Flag for sync pickup
        await db.put(STORE_DAILY_LOGS, logToSave);

        // Fire and forget background sync
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                dbStore.syncPendingSessions().catch(console.error);
            }, 1000);
        }
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
