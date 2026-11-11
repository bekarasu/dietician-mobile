import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { t } from '../../i18n';
import { theme } from '../../theme/theme';
import { DialogButton, QueuedDialog, useDialogStore } from './dialogStore';

const BACKDROP = 'rgba(11, 19, 32, 0.45)';

function buttonVariant(button: DialogButton, hasDestructive: boolean) {
  if (button.style === 'destructive') {
    return 'danger';
  }
  if (button.style === 'cancel') {
    return 'ghost';
  }
  // Next to a destructive button, a default one is the softer way out.
  return hasDestructive ? 'secondary' : 'primary';
}

// Shows dialogs from showDialog one at a time. Mounted once, above the navigators.
export function DialogHost() {
  const current = useDialogStore((state) => state.queue[0]);
  const dismiss = useDialogStore((state) => state.dismiss);
  const scale = useRef(new Animated.Value(1)).current;

  // Keeps the last dialog rendered while the modal fades out.
  const lastShown = useRef<QueuedDialog | undefined>(current);
  if (current) {
    lastShown.current = current;
  }
  const dialog = current ?? lastShown.current;

  // Each new dialog, including the next one in the queue, pops in.
  const currentId = current?.id;
  useEffect(() => {
    if (currentId != null) {
      scale.setValue(0.94);
      Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 6, useNativeDriver: true }).start();
    }
  }, [currentId, scale]);

  if (!dialog) {
    return null;
  }

  const buttons: DialogButton[] = dialog.buttons ?? [{ text: t('common.actions.ok') }];
  const cancelButton = buttons.find((button) => button.style === 'cancel');
  const orderedButtons = [...buttons.filter((button) => button !== cancelButton), ...(cancelButton ? [cancelButton] : [])];
  const hasDestructive = buttons.some((button) => button.style === 'destructive');
  const tone = dialog.tone ?? (hasDestructive ? 'danger' : 'primary');
  const icon = dialog.icon ?? (tone === 'danger' ? 'alert-circle-outline' : 'information-circle-outline');

  // Ignores taps that land during the fade-out, so an action can't run twice.
  const press = (button?: DialogButton) => {
    if (useDialogStore.getState().queue[0]?.id !== dialog.id) {
      return;
    }
    dismiss(dialog.id);
    button?.onPress?.();
  };

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={() => press(cancelButton)}
      statusBarTranslucent
      transparent
      visible={current != null}
    >
      <View style={styles.backdrop}>
        <Pressable accessible={false} onPress={() => press(cancelButton)} style={StyleSheet.absoluteFill} />
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={() => press(cancelButton)}
          style={[styles.card, { transform: [{ scale }] }]}
        >
          <View style={[styles.icon, tone === 'danger' && styles.iconDanger]}>
            <Ionicons color={tone === 'danger' ? theme.colors.danger : theme.colors.primary} name={icon} size={28} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {dialog.title}
          </Text>
          {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          <View style={styles.actions}>
            {orderedButtons.map((button) => (
              <AppButton
                key={button.text}
                onPress={() => press(button)}
                title={button.text}
                variant={buttonVariant(button, hasDestructive)}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: BACKDROP,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    ...theme.shadows.card,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primarySoft,
  },
  iconDanger: {
    backgroundColor: theme.colors.dangerSoft,
  },
  title: {
    ...theme.typography.title,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.text,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
});
