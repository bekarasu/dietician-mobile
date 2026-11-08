import { DietaryPreference, GoalType, UserProfile } from '../types/models';
import { fetchWithAuth } from './apiClient';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/profiles`;

// The profile fields a screen can edit. Weight isn't one: weigh-ins set it, and
// sending the app's copy back would overwrite a newer one.
export interface ProfileDetails {
  name?: string;
  age?: number;
  heightCm?: number;
  targetWeightKg?: number;
  goalType?: GoalType;
  activityLevel?: string;
  gender?: string;
  // Starts or moves a pregnancy plan, and 0 ends it. The server stores the due
  // date it gives, so only send it when the user changes it.
  pregnancyWeek?: number;
}

// Lists left out are kept on the server; an empty list clears one.
export interface PreferenceChanges {
  dietaryPreferences?: DietaryPreference[];
  dislikedFoods?: string[];
  allergies?: string[];
  availableIngredients?: string[];
}

export const profileService = {
  async getProfile(): Promise<UserProfile | null> {
    const response = await fetchWithAuth(`${API_URL}?include_fridge=true`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const json = await response.json();
    const data = json.data;

    // Preferences live on their own endpoint. If they can't be read, failing is
    // safer than empty lists, which a later save would write back over the real ones.
    const prefResponse = await fetchWithAuth(`${API_URL}/preferences`);
    if (!prefResponse.ok) {
      throw new Error('Failed to fetch preferences');
    }

    const prefJson = await prefResponse.json();
    const prefs = {
      dietaryPreferences: prefJson.data.preferences?.map((p: any) => p.preference) || [],
      dislikedFoods: prefJson.data.dislikedFoods?.map((f: any) => f.foodName) || [],
      allergies: prefJson.data.allergies?.map((a: any) => a.allergy) || [],
      availableIngredients: prefJson.data.availableIngredients?.map((i: any) => i.ingredient) || [],
    };

    // Use availableIngredients from the profile payload if present, otherwise fallback to preferences
    const availableIngredients = data.availableIngredients || prefs.availableIngredients;

    return {
      id: data.id,
      name: data.displayName,
      age: data.age,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      targetWeightKg: data.targetWeightKg,
      goalType: data.goal,
      dailyCalorieTarget: data.dailyCalorieTarget,
      dietaryPreferences: prefs.dietaryPreferences,
      dislikedFoods: prefs.dislikedFoods,
      availableIngredients: availableIngredients,
      allergies: prefs.allergies,
      activityLevel: data.activityLevel,
      gender: data.gender,
      targetWaterMl: data.targetWaterMl,
      targetCoffeeCups: data.targetCoffeeCups,
      pregnancyWeek: data.pregnancyWeek,
      pregnancyDueDate: data.pregnancyDueDate,
    } as UserProfile;
  },

  // Sends only the fields given; the server keeps the rest.
  async updateDetails(details: ProfileDetails): Promise<void> {
    const response = await fetchWithAuth(`${API_URL}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: details.name,
        age: details.age,
        heightCm: details.heightCm,
        targetWeightKg: details.targetWeightKg,
        goal: details.goalType,
        activityLevel: details.activityLevel,
        gender: details.gender,
        pregnancyWeek: details.pregnancyWeek,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
  },

  // Sends only the lists given, so saving one list can't empty another.
  async updatePreferences(changes: PreferenceChanges): Promise<void> {
    const response = await fetchWithAuth(`${API_URL}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences: changes.dietaryPreferences,
        allergies: changes.allergies?.map((allergy) => ({ allergy })),
        dislikedFoods: changes.dislikedFoods,
        availableIngredients: changes.availableIngredients,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }
  },
};