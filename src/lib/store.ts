import { create } from 'zustand';
import { Session, Activity, Set as WorkoutSet } from '../models/Session';
import { DailyLog, FoodItem, MealType } from '../models/Nutrition';
import { UserProfile } from '../models/User';
import { dbStore } from './db';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

interface SessionState {
    activeSession: Session | null;
    currentDailyLog: DailyLog | null;

    // Authentication State
    user: User | null;
    userProfile: UserProfile | null;
    isAuthenticated: boolean;
    initializeAuth: () => void;
    onboardUser: (stats: Partial<UserProfile>) => Promise<void>;

    // High-level Actions
    loadActiveSession: () => Promise<void>;
    startNewSession: (userId: string, targetRoutine: string, startTimeOverride?: number, initialActivities?: Activity[], sessionName?: string) => void;
    endSession: () => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;

    addActivityToSession: (activity: Activity) => void;
    removeActivity: (activityId: string) => void;
    updateActivity: (activity: Activity) => void;
    updateSessionStartTime: (newTime: number) => void;
    updateSessionEndTime: (newTime: number) => void;
    pauseSession: () => void;
    resumeSession: () => void;

    // Phase 9 Nutrition/Daily Log Actions
    loadDailyLog: (date: string) => Promise<void>;
    addFoodItem: (mealType: MealType, item: FoodItem) => void;
    removeFoodItem: (mealType: MealType, itemId: string) => void;
    updateBodyweight: (weight: number) => void;

    // Legacy set tracking
    addSetToActivity: (activityId: string, set: WorkoutSet) => void;
    updateSet: (activityId: string, setId: string, weight: number, reps: number) => void;

    restoreSession: (session: Session) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
    activeSession: null,
    currentDailyLog: null,
    user: null,
    userProfile: null,
    isAuthenticated: false,

    initializeAuth: () => {
        const fetchOrInitializeProfile = async (sessionUser: User) => {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
            if (data) {
                set({ userProfile: data });
            } else if (error && error.code === 'PGRST116') {
                // No profile found, we need to insert a default one
                const newProfile = {
                    id: sessionUser.id,
                    email: sessionUser.email,
                    full_name: sessionUser.user_metadata?.full_name,
                    avatar_url: sessionUser.user_metadata?.avatar_url,
                    is_onboarded: false
                };
                const { data: inserted } = await supabase.from('profiles').insert([newProfile]).select().single();
                if (inserted) {
                    set({ userProfile: inserted });
                }
            }
        };

        // Check initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const isAuthed = !!session?.user;
            set({
                user: session?.user ?? null,
                isAuthenticated: isAuthed,
            });

            if (isAuthed && session?.user) {
                await fetchOrInitializeProfile(session.user);
                await dbStore.pullCloudSessions();
                await dbStore.syncPendingSessions();
            }
        });

        // Listen for Auth changes in realtime
        supabase.auth.onAuthStateChange(async (event, session) => {
            const isAuthed = !!session?.user;
            set({
                user: session?.user ?? null,
                isAuthenticated: isAuthed,
                // On sign out, clear profile
                ...(!isAuthed && { userProfile: null })
            });

            if (event === 'SIGNED_IN' && isAuthed && session?.user) {
                await fetchOrInitializeProfile(session.user);
                await dbStore.pullCloudSessions();
                await dbStore.syncPendingSessions();
            }

            if (event === 'SIGNED_OUT') {
                // Wipe local DB cache of sessions if desired, or keep as anonymous history.
                // Keeping as anonymous allows them to keep their data if they accidentally log out.
            }
        });
    },

    onboardUser: async (stats: Partial<UserProfile>) => {
        const { user } = get();
        if (!user) return;

        const updateData = {
            ...stats,
            is_onboarded: true,
        };

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id)
            .select()
            .single();

        if (data) {
            set({ userProfile: data });
        } else {
            console.error("Failed to onboard:", error);
        }
    },

    // Phase 29: Persistent Startup Hydration
    loadActiveSession: async () => {
        try {
            const allSessions = await dbStore.getAllSessions();
            // Find any session that has not been ended
            const activeOrPausedSessions = allSessions.filter(s => !s.endTime);
            if (activeOrPausedSessions.length > 0) {
                // If somehow multiple exist, grab the most recent one
                const mostRecent = activeOrPausedSessions.sort((a, b) => b.startTime - a.startTime)[0];
                set({ activeSession: mostRecent });
            }
        } catch (err) {
            console.error("Failed to load active session on startup", err);
        }
    },

    startNewSession: (userId: string, _targetRoutine: string, startTimeOverride?: number, initialActivities?: Activity[], sessionName?: string) => {
        let initialEndTime: number | undefined = undefined;

        if (startTimeOverride) {
            const startDay = new Date(startTimeOverride);
            startDay.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDay.getTime() < today.getTime()) {
                initialEndTime = startTimeOverride + (60 * 60 * 1000); // Default to 1 hour duration
            }
        }

        const newSession: Session = {
            id: `sesh_${Date.now()}`,
            userId: get().user?.id || userId,
            name: sessionName || 'Workout',
            startTime: startTimeOverride || Date.now(),
            endTime: initialEndTime,
            activities: initialActivities || [],
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

    updateSessionEndTime: (newTime: number) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedSession = {
            ...activeSession,
            endTime: newTime
        };

        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    pauseSession: () => {
        const { activeSession } = get();
        if (!activeSession || activeSession.status === 'paused') return;

        const updatedSession: Session = {
            ...activeSession,
            status: 'paused',
            pausedAt: Date.now()
        };

        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    resumeSession: () => {
        const { activeSession } = get();
        if (!activeSession || activeSession.status !== 'paused' || !activeSession.pausedAt) return;

        const pauseDuration = Date.now() - activeSession.pausedAt;
        const updatedTotalPausedMs = (activeSession.totalPausedMs || 0) + pauseDuration;

        const updatedSession: Session = {
            ...activeSession,
            status: 'active',
            pausedAt: undefined,
            totalPausedMs: updatedTotalPausedMs
        };

        set({ activeSession: updatedSession });
        dbStore.saveSession(updatedSession).catch(console.error);
    },

    // Legacy Intra-session updates (preserved for now)
    addSetToActivity: (activityId: string, newSet: WorkoutSet) => {
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
