import { create } from 'zustand';
import { Session, Activity, Set as WorkoutSet } from '../models/Session';
import { DailyLog, FoodItem, MealType } from '../models/Nutrition';
import { dbStore } from './db';

interface SessionState {
    activeSession: Session | null;
    currentDailyLog: DailyLog | null;

    // High-level Actions
    startNewSession: (userId: string, targetRoutine: string, startTimeOverride?: number) => void;
    endSession: () => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;

    // Phase 6 High-Level Activity Management
    addActivityToSession: (activity: Activity) => void;
    removeActivity: (activityId: string) => void;
    updateActivity: (activity: Activity) => void;
    updateSessionStartTime: (newTime: number) => void;

    // Phase 9 Nutrition/Daily Log Actions
    loadDailyLog: (date: string) => Promise<void>;
    addFoodItem: (mealType: MealType, item: FoodItem) => void;
    removeFoodItem: (mealType: MealType, itemId: string) => void;
    updateBodyweight: (weight: number) => void;

    // Legacy set tracking
    addSetToActivity: (activityId: string, set: any) => void;
    updateSet: (activityId: string, setId: string, weight: number, reps: number) => void;

    restoreSession: (session: Session) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
    activeSession: null,
    currentDailyLog: null,

    startNewSession: (userId: string, _targetRoutine: string, startTimeOverride?: number) => {
        const newSession: Session = {
            id: `sesh_${Date.now()}`,
            userId,
            startTime: startTimeOverride || Date.now(),
            activities: [],
            isSynced: false,
        };

        set({ activeSession: newSession });
        dbStore.saveSession(newSession).catch(console.error);
    },

    endSession: async () => {
        const { activeSession } = get();
        if (!activeSession) return;

        const completedSession = { ...activeSession, endTime: Date.now() };
        await dbStore.saveSession(completedSession);
        set({ activeSession: null });
    },

    deleteSession: async (sessionId: string) => {
        const { activeSession } = get();
        await dbStore.deleteSession(sessionId);

        // If the deleted session was actively loaded, clear the state
        if (activeSession && activeSession.id === sessionId) {
            set({ activeSession: null });
        }
    },

    addActivityToSession: (newActivity: Activity) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedSession = {
            ...activeSession,
            activities: [...activeSession.activities, newActivity]
        };

        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    removeActivity: (activityId: string) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedSession = {
            ...activeSession,
            activities: activeSession.activities.filter(a => a.id !== activityId)
        };

        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    updateActivity: (updatedActivity: Activity) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedSession = {
            ...activeSession,
            activities: activeSession.activities.map(a =>
                a.id === updatedActivity.id ? updatedActivity : a
            )
        };

        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    updateSessionStartTime: (newTime: number) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedSession = {
            ...activeSession,
            startTime: newTime
        };

        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    // Legacy Intra-session updates (preserved for now)
    addSetToActivity: (activityId: string, newSet: any) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedActivities = activeSession.activities.map(act => {
            if (act.id === activityId && act.type === 'weightlifting') {
                return { ...act, sets: [...act.sets, newSet] };
            }
            return act;
        });

        const updatedSession = { ...activeSession, activities: updatedActivities };
        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    updateSet: (activityId: string, setId: string, weight: number, reps: number) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedActivities = activeSession.activities.map(act => {
            if (act.id === activityId && act.type === 'weightlifting') {
                const updatedSets = act.sets.map(s =>
                    s.id === setId ? { ...s, weight, reps } : s
                );
                return { ...act, sets: updatedSets };
            }
            return act;
        });

        const updatedSession = { ...activeSession, activities: updatedActivities };
        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    restoreSession: (session: Session) => {
        set({ activeSession: session });
    },

    // --- Phase 9: Nutrition/Daily Log Implementations ---
    loadDailyLog: async (date: string) => {
        let log = await dbStore.getDailyLog(date);

        // If no log exists for today, create a blank template
        if (!log) {
            log = {
                date,
                meals: [
                    { type: 'Breakfast', items: [] },
                    { type: 'Lunch', items: [] },
                    { type: 'Dinner', items: [] },
                    { type: 'Snacks', items: [] }
                ],
                goals: { calories: 2500, protein: 180, carbs: 300, fat: 65 } // Default baseline
            };
            await dbStore.saveDailyLog(log);
        }

        set({ currentDailyLog: log });
    },

    addFoodItem: (mealType: MealType, item: FoodItem) => {
        const { currentDailyLog } = get();
        if (!currentDailyLog) return;

        const updatedMeals = currentDailyLog.meals.map(meal => {
            if (meal.type === mealType) {
                return { ...meal, items: [...meal.items, item] };
            }
            return meal;
        });

        const updatedLog = { ...currentDailyLog, meals: updatedMeals };
        set({ currentDailyLog: updatedLog });
        dbStore.saveDailyLog(updatedLog).catch(console.error);
    },

    removeFoodItem: (mealType: MealType, itemId: string) => {
        const { currentDailyLog } = get();
        if (!currentDailyLog) return;

        const updatedMeals = currentDailyLog.meals.map(meal => {
            if (meal.type === mealType) {
                return { ...meal, items: meal.items.filter(i => i.id !== itemId) };
            }
            return meal;
        });

        const updatedLog = { ...currentDailyLog, meals: updatedMeals };
        set({ currentDailyLog: updatedLog });
        dbStore.saveDailyLog(updatedLog).catch(console.error);
    },

    updateBodyweight: (weight: number) => {
        const { currentDailyLog } = get();
        if (!currentDailyLog) return;

        const updatedLog = { ...currentDailyLog, bodyweight: weight };
        set({ currentDailyLog: updatedLog });
        dbStore.saveDailyLog(updatedLog).catch(console.error);
    }
}));
