export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

export interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface Meal {
    type: MealType;
    items: FoodItem[];
}

export interface NutritionGoals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface DailyLog {
    /** YYYY-MM-DD string as the primary key */
    date: string;
    meals: Meal[];
    bodyweight?: number; // in lbs or kg based on user pref
    goals: NutritionGoals;
    isSynced?: boolean;
}
