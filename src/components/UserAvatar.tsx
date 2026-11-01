import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

interface UserAvatarProps {
  name: string;
}

export function UserAvatar({ name }: UserAvatarProps) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.initial}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
