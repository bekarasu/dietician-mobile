import { UserProfile } from '../types/models';
import { fetchWithAuth } from './apiClient';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/profiles`;

export const profileService = {
  async getProfile(): Promise<UserProfile | null> {
    const response = await fetchWithAuth(`${API_URL}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const json = await response.json();
    const data = json.data;

    // We also need to fetch preferences since they aren't included in the base profile endpoint
    const prefResponse = await fetchWithAuth(`${API_URL}/preferences`);

    let prefs = { dietaryPreferences: [], dislikedFoods: [] };
    if (prefResponse.ok) {
      const prefJson = await prefResponse.json();
      prefs.dietaryPreferences = prefJson.data.preferences?.map((p: any) => p.preference) || [];
      prefs.dislikedFoods = prefJson.data.dislikedFoods?.map((f: any) => f.foodName) || [];
    }

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
      activityLevel: data.activityLevel,
      gender: data.gender,
      targetWaterMl: data.targetWaterMl,
      targetCoffeeCups: data.targetCoffeeCups,
    } as UserProfile;
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_URL}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: profile.name,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        targetWeightKg: profile.targetWeightKg,
        goal: profile.goalType,
        dailyCalorieTarget: profile.dailyCalorieTarget,
        activityLevel: profile.activityLevel,
        gender: profile.gender,
        targetWaterMl: profile.targetWaterMl,
        targetCoffeeCups: profile.targetCoffeeCups,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const prefResponse = await fetchWithAuth(`${API_URL}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences: profile.dietaryPreferences,
        allergies: [],
        dislikedFoods: profile.dislikedFoods,
      }),
    });

    if (!prefResponse.ok) {
      throw new Error('Failed to update preferences');
    }

    return profile;
  },
};