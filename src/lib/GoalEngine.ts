export type GoalType = 'hypertrophy' | 'endurance' | 'strength';
export type BlockLength = 8 | 12 | 16;
export type SplitType = 'PPL' | 'UpperLower' | 'FullBody';

export interface TrainingBlock {
    blockLength: BlockLength;
    goal: GoalType;
    split: SplitType;
    targetMetric: string; // e.g., "Deadlift 400lbs" or "Run Sub-20 5k"
    weeks: WeekPlan[];
}

export interface WeekPlan {
    weekNumber: number;
    intensityTarget: number; // calculated via the formula
    isDeload: boolean;
    sessions: SessionPlan[];
}

export interface SessionPlan {
    day: number;
    focus: string; // e.g., "Push", "Pull", "Legs"
    exercises: string[]; // generic stubs that would map to real DB items
}

export class GoalEngine {
    /**
     * Calculates the intensity I(t) for a given week t based on periodization formula
     * I(t) = A * sin(B * t) + C
     * 
     * This guarantees a deload (dip in intensity) every 4th week by setting proper A,B,C.
     */
    static calculateIntensity(t: number, length: BlockLength, goal: GoalType): number {
        // Amplitude defines how drastically intensity swings
        const A = goal === 'strength' ? 0.08 : 0.05;

        // We want a deload every 4 weeks. A full period is 4 weeks.
        // So B = (2 * PI) / 4 = PI / 2.
        // By offsetting t by 1.5, we align the trough (sin(3PI/2)) to t=4, t=8
        const B = Math.PI / 2;

        // Base intensity C creeps up slowly over the block to enforce progressive overload
        // It starts at around 0.70 (70% 1RM) and ends near 0.95 (95% 1RM)
        const baseC = 0.70;
        const finalC = goal === 'endurance' ? 0.85 : 0.95;
        const creep = ((finalC - baseC) / length) * t;
        const C = baseC + Math.max(0, creep);

        // Full periodization formula from specs
        const I = A * Math.sin(B * (t - 1.5)) + C;

        return Number(I.toFixed(3));
    }

    /**
     * Generates a full Training Block (adaptive algorithm)
     */
    static generateBlock(
        targetMetric: string,
        goal: GoalType,
        length: BlockLength,
        split: SplitType
    ): TrainingBlock {
        const weeks: WeekPlan[] = [];

        for (let t = 1; t <= length; t++) {
            const intensityTarget = this.calculateIntensity(t, length, goal);
            // Determine if it's a deload week (drop in intensity vs the week before, or strictly every 4th week)
            const isDeload = t % 4 === 0;

            let initialSessions = this.generateSessionsForSplit(split);

            // If it's a deload week, visually append "(Deload)" to the focus of working days
            if (isDeload) {
                initialSessions = initialSessions.map(session => {
                    if (session.focus.toLowerCase().includes('rest')) return session;
                    return { ...session, focus: `${session.focus} (Deload)` };
                });
            }

            weeks.push({
                weekNumber: t,
                intensityTarget,
                isDeload,
                sessions: initialSessions
            });
        }

        return {
            blockLength: length,
            goal,
            split,
            targetMetric,
            weeks
        };
    }

    public static generateSessionsForSplit(split: SplitType): SessionPlan[] {
        switch (split) {
            case 'PPL':
                return [
                    { day: 1, focus: 'Push', exercises: ['Bench Press', 'Overhead Press', 'Tricep Extension'] },
                    { day: 2, focus: 'Pull', exercises: ['Deadlift', 'Pull-ups', 'Bicep Curls'] },
                    { day: 3, focus: 'Legs', exercises: ['Squats', 'Leg Press', 'Calf Raises'] },
                    { day: 4, focus: 'Rest', exercises: [] },
                    { day: 5, focus: 'Push', exercises: ['Incline DB Press', 'Lateral Raises', 'Dips'] },
                    { day: 6, focus: 'Pull', exercises: ['Barbell Row', 'Lat Pulldown', 'Face Pulls'] },
                    { day: 7, focus: 'Legs', exercises: ['Romanian Deadlift', 'Leg Extensions', 'Hamstring Curls'] },
                ];
            case 'UpperLower':
                return [
                    { day: 1, focus: 'Upper', exercises: ['Bench Press', 'Rows', 'Shoulder Press'] },
                    { day: 2, focus: 'Lower', exercises: ['Squats', 'RDLs', 'Calves'] },
                    { day: 3, focus: 'Rest', exercises: [] },
                    { day: 4, focus: 'Upper', exercises: ['Pull-ups', 'Incline Press', 'Arms'] },
                    { day: 5, focus: 'Lower', exercises: ['Deadlift', 'Leg Press', 'Hamstrings'] },
                    { day: 6, focus: 'Rest', exercises: [] },
                    { day: 7, focus: 'Rest', exercises: [] },
                ];
            case 'FullBody':
            default:
                return [
                    { day: 1, focus: 'Full Body A', exercises: ['Squat', 'Bench Press', 'Barbell Row'] },
                    { day: 2, focus: 'Rest', exercises: [] },
                    { day: 3, focus: 'Full Body B', exercises: ['Deadlift', 'Overhead Press', 'Pull-ups'] },
                    { day: 4, focus: 'Rest', exercises: [] },
                    { day: 5, focus: 'Full Body A', exercises: ['Front Squat', 'Incline Press', 'Cable Rows'] },
                    { day: 6, focus: 'Rest', exercises: [] },
                    { day: 7, focus: 'Rest', exercises: [] },
                ];
        }
    }
}
