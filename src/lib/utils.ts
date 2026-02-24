import { Session } from '../models/Session';
import { SplitType, SessionPlan } from './GoalEngine';

export function getDynamicSessionTitle(session: Session): string {
    const start = new Date(session.startTime);
    const hour = start.getHours();

    let timeOfDay = 'Night';
    if (hour >= 5 && hour < 12) timeOfDay = 'Morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';

    let primaryType = 'Weightlifting';
    let activityNoun = 'Lift';

    if (session.activities && session.activities.length > 0) {
        let weightlifting = 0;
        let cardio = 0;
        let mobility = 0;

        session.activities.forEach(act => {
            if (act.type === 'weightlifting') weightlifting++;
            else if (act.type === 'cardio') cardio++;
            else if (act.type === 'mobility') mobility++;
        });

        const max = Math.max(weightlifting, cardio, mobility);
        if (max === cardio && max > weightlifting) {
            primaryType = 'Cardio';
            activityNoun = 'Run';
        } else if (max === mobility && max > weightlifting) {
            primaryType = 'Mobility';
            activityNoun = 'Flow';
        }
    }

    const specificName = session.name && session.name !== 'Workout' && session.name !== 'Custom Workout'
        ? session.name
        : activityNoun;

    return `${primaryType} - ${timeOfDay} ${specificName}`;
}

/**
 * Returns a deterministic "YYYY-MM-DD" string representing the Sunday of the week
 * that the given date falls into. This is used as the storage key for weekly splits.
 */
export function getWeekSundayString(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    d.setDate(d.getDate() - day);

    // Format to YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dom = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${dom}`;
}

/**
 * Resolves the active split Configuration for a specific Date.
 * If the exact week has a stored config, it returns it.
 * Otherwise, it searches backwards to find the most recently configured week (carryover logic).
 * If no configuration exists *anywhere*, it defaults to 'PPL'.
 */
export function resolveActiveSplitForDate(date: Date): {
    splitType: SplitType,
    customItems: SessionPlan[] | null,
    isCarriedOver: boolean
} {
    if (typeof window === 'undefined') {
        return { splitType: 'PPL', customItems: null, isCarriedOver: false }; // SSR fallback
    }

    const targetWeekKey = getWeekSundayString(date);

    // 1. Check if an explicit config exists for THIS specific week
    const exactSplit = localStorage.getItem(`activeSplit_${targetWeekKey}`);
    if (exactSplit) {
        let customItems: SessionPlan[] | null = null;
        const exactCustom = localStorage.getItem(`customSplitItems_${targetWeekKey}`);
        if (exactCustom) {
            try { customItems = JSON.parse(exactCustom); } catch { }
        }
        return { splitType: exactSplit as SplitType, customItems, isCarriedOver: false };
    }

    // 2. If no exact match, search backwards for up to 52 weeks (1 year) to find the most recent configuration to carry forward
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    searchDate.setDate(searchDate.getDate() - searchDate.getDay()); // Normalize to current sunday

    for (let i = 1; i <= 52; i++) {
        // Step back exactly one week
        searchDate.setDate(searchDate.getDate() - 7);
        const searchKey = getWeekSundayString(searchDate);

        const foundSplit = localStorage.getItem(`activeSplit_${searchKey}`);
        if (foundSplit) {
            let customItems: SessionPlan[] | null = null;
            const foundCustom = localStorage.getItem(`customSplitItems_${searchKey}`);
            if (foundCustom) {
                try { customItems = JSON.parse(foundCustom); } catch { }
            }
            return { splitType: foundSplit as SplitType, customItems, isCarriedOver: true };
        }
    }

    // 3. Backwards compatibility fallback (if they just have the old global keys)
    const legacySplit = localStorage.getItem('activeSplit');
    if (legacySplit) {
        let customItems: SessionPlan[] | null = null;
        const legacyCustom = localStorage.getItem('customSplitItems');
        if (legacyCustom) {
            try { customItems = JSON.parse(legacyCustom); } catch { }
        }
        return { splitType: legacySplit as SplitType, customItems, isCarriedOver: true };
    }

    // 4. Ultimate default if brand new
    return { splitType: 'PPL', customItems: null, isCarriedOver: false };
}
