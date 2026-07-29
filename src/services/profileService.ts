import { UserProfile } from '../types/models';
import { tokenService } from './tokenService';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/profiles`;

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const token = await tokenService.getAccessToken();
    const response = await fetch(`${API_URL}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const json = await response.json();
    const data = json.data;

    // We also need to fetch preferences since they aren't included in the base profile endpoint
    const prefResponse = await fetch(`${API_URL}/preferences`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    let prefs = { dietaryPreferences: [], dislikedFoods: [] };
    if (prefResponse.ok) {
      const prefJson = await prefResponse.json();
      prefs.dietaryPreferences = prefJson.data.preferences?.map((p: any) => p.preference) || [];
      prefs.dislikedFoods = prefJson.data.disliked_foods?.map((f: any) => f.food_name) || [];
    }

    return {
      id: data.id,
      name: data.display_name,
      age: data.age,
      heightCm: data.height_cm,
      weightKg: data.weight_kg,
      targetWeightKg: data.target_weight_kg,
      goalType: data.goal,
      dailyCalorieTarget: data.daily_calorie_target,
      dietaryPreferences: prefs.dietaryPreferences,
      dislikedFoods: prefs.dislikedFoods,
    } as UserProfile;
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    const token = await tokenService.getAccessToken();
    const response = await fetch(`${API_URL}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        display_name: profile.name,
        age: profile.age,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        target_weight_kg: profile.targetWeightKg,
        goal: profile.goalType,
        daily_calorie_target: profile.dailyCalorieTarget,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const prefResponse = await fetch(`${API_URL}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        preferences: profile.dietaryPreferences,
        allergies: [],
        disliked_foods: profile.dislikedFoods,
      }),
    });

    if (!prefResponse.ok) {
      throw new Error('Failed to update preferences');
    }

    return profile;
  },
};