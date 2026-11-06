import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

export interface AvatarColors {
  background: string;
  text: string;
}

// Kept clear of the habit colours, so an avatar isn't read as water or coffee points.
const AVATAR_COLORS: AvatarColors[] = [
  { background: theme.colors.primarySoft, text: theme.colors.primary },
  { background: '#E0E7FF', text: '#4338CA' },
  { background: '#FFE4E6', text: '#BE123C' },
  { background: '#EDE9FE', text: '#6D28D9' },
  { background: '#ECFCCB', text: '#4D7C0F' },
  { background: '#FAE8FF', text: '#A21CAF' },
];

// Keyed by user ID, so a person keeps their colour when they rename.
export function getAvatarColors(userId: string) {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface UserAvatarProps {
  name: string;
  size?: number;
  // Without colours, the avatar uses the app's neutral style.
  colors?: AvatarColors;
}

export function UserAvatar({ name, size = 40, colors }: UserAvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        colors ? { backgroundColor: colors.background, borderColor: colors.background } : undefined,
      ]}
    >
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.36) }, colors ? { color: colors.text } : undefined]}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondarySurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  initial: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
