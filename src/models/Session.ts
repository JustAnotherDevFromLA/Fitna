export type ActivityType = "weightlifting" | "cardio" | "mobility";

export interface BaseActivity {
  id: string;
  type: ActivityType;
  name: string; // e.g., "Squat", "5K Run", "Pilates Flow"
  notes?: string;
}

// Weightlifting specific
export interface Set {
  id: string;
  weight: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion
  isWarmup?: boolean;
}

export interface WeightliftingActivity extends BaseActivity {
  type: "weightlifting";
  sets: Set[];
}

// Cardio specific
export interface CardioActivity extends BaseActivity {
  type: "cardio";
  distance?: number; // in meters or miles based on user preference
  duration?: number; // in seconds
  heartRateAvg?: number;
  pace?: string; 
}

// Mobility/Pilates specific
export interface MobilityActivity extends BaseActivity {
  type: "mobility";
  duration: number; // in seconds
  flowType?: string;
}

export type Activity = WeightliftingActivity | CardioActivity | MobilityActivity;

// Session specific
export interface Session {
  id: string;
  userId: string;
  startTime: number; // Unix timestamp
  endTime?: number;
  activities: Activity[];
  isSynced: boolean; // For local-first caching strategy
}
