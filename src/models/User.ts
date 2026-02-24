export interface UserProfile {
    id: string; // matches auth.users UUID
    email?: string;
    full_name?: string;
    avatar_url?: string;

    // Lifting Baseline
    squat_1rm?: number;
    bench_1rm?: number;
    deadlift_1rm?: number;
    bodyweight?: number;

    is_onboarded: boolean;
    created_at: string;
}
