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
        displayName: profile.name,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        targetWeightKg: profile.targetWeightKg,
        goal: profile.goalType,
        dailyCalorieTarget: profile.dailyCalorieTarget,
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
        dislikedFoods: profile.dislikedFoods,
      }),
    });

    if (!prefResponse.ok) {
      throw new Error('Failed to update preferences');
    }

    return profile;
  },
};