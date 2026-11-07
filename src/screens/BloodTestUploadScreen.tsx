import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { BLOOD_TEST_DISCLAIMER } from '../constants/health';
import { showDialog } from '../features/dialog/dialogStore';
import { bloodTestService } from '../services/bloodTestService';
import { theme } from '../theme/theme';
import { BloodTestUpload } from '../types/models';
import { formatDateLabel } from '../utils/date';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Reading results',
  completed: 'Results read',
  parse_failed: 'Results not read',
};

// The screen lock, by biometrics or passcode, guards the results. The server
// doesn't ask for it, so it only keeps out someone else holding the phone.
async function unlock(promptMessage: string) {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) {
    showDialog({
      title: 'Set up a screen lock',
      message: 'Your blood test results are protected by your screen lock. Set up a passcode or biometrics in your phone settings to use this.',
      icon: 'lock-closed-outline',
    });
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({ promptMessage, fallbackLabel: 'Use Passcode' });
  return result.success;
}

export function BloodTestUploadScreen() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(true);
  // Undefined while loading.
  const [uploads, setUploads] = useState<BloodTestUpload[]>();
  const [failed, setFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUploads(await bloodTestService.listUploads());
      setFailed(false);
    } catch (error) {
      console.error('Failed to load blood tests', error);
      setFailed(true);
    }
  }, []);

  const tryUnlock = useCallback(async () => {
    setIsUnlocking(true);
    try {
      if (await unlock('Unlock your blood test results')) {
        setIsUnlocked(true);
        void load();
      }
    } catch (error) {
      console.error('Failed to unlock blood tests', error);
    } finally {
      setIsUnlocking(false);
    }
  }, [load]);

  useEffect(() => {
    void tryUnlock();
  }, [tryUnlock]);

  const retry = () => {
    setFailed(false);
    setUploads(undefined);
    void load();
  };

  // Hiding, showing and deleting each ask for the screen lock again. A failure
  // reloads the list, in case the result changed elsewhere.
  const run = async (id: string, promptMessage: string, failure: string, action: () => Promise<void>) => {
    try {
      if (!(await unlock(promptMessage))) {
        return;
      }
    } catch (error) {
      console.error('Failed to unlock blood tests', error);
      return;
    }

    setBusyId(id);
    try {
      await action();
    } catch (error) {
      console.error('Failed to change a blood test', error);
      showDialog({ title: 'Error', message: failure, tone: 'danger' });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleVisibility = (upload: BloodTestUpload) => {
    const isHidden = !upload.isHidden;
    void run(
      upload.id,
      isHidden ? 'Unlock to hide this result' : 'Unlock to show this result',
      `We couldn't ${isHidden ? 'hide' : 'show'} this result. Please try again.`,
      async () => {
        await bloodTestService.toggleVisibility(upload.id, isHidden);
        setUploads((current) => current?.map((item) => (item.id === upload.id ? { ...item, isHidden } : item)));
      },
    );
  };

  const confirmDelete = (upload: BloodTestUpload) => {
    showDialog({
      title: 'Delete this result?',
      message: 'It leaves your results, and your next plans won\'t use it.',
      icon: 'trash-outline',
      buttons: [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => run(upload.id, 'Unlock to delete this result', 'We couldn\'t delete this result. Please try again.', async () => {
            await bloodTestService.deleteUpload(upload.id);
            setUploads((current) => current?.filter((item) => item.id !== upload.id));
          }),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  if (!isUnlocked) {
    return (
      <ScreenContainer>
        <SectionHeader title="Blood test results" subtitle="Your results are protected by your screen lock." />
        {isUnlocking ? (
          <ActivityIndicator color={theme.colors.primary} size="large" style={styles.loading} />
        ) : (
          <AppCard style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons color={theme.colors.primary} name="lock-closed-outline" size={28} />
            </View>
            <Text style={styles.stateText}>Unlock to see your blood test results.</Text>
            <AppButton title="Unlock" onPress={tryUnlock} />
          </AppCard>
        )}
      </ScreenContainer>
    );
  }

  const renderResults = (upload: BloodTestUpload) => {
    const groups = upload.parsedResults?.testGroups ?? [];

    if (upload.isHidden) {
      return <Text style={styles.noteText}>This result is hidden. Show it to see what was read from it.</Text>;
    }
    if (groups.length === 0) {
      return (
        <Text style={styles.noteText}>
          {upload.status === 'pending' ? 'We\'re still reading this report.' : 'No results could be read from this report.'}
        </Text>
      );
    }

    return groups.map((group, groupIndex) => (
      <View key={groupIndex} style={styles.tableGroup}>
        {group.groupName ? <Text style={styles.groupTitle}>{group.groupName}</Text> : null}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.tableHeaderCell, styles.testColumn]}>Test</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell, styles.valueColumn]}>Result</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell, styles.valueColumn]}>Ref</Text>
        </View>
        {group.tests.map((test, testIndex) => (
          <View key={testIndex} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.testColumn]} numberOfLines={2}>{test.testName}</Text>
            <Text style={[styles.tableCell, styles.valueColumn]}>{test.result} {test.resultUnit}</Text>
            <Text style={[styles.tableCell, styles.valueColumn, styles.referenceCell]}>{test.referenceValue}</Text>
          </View>
        ))}
      </View>
    ));
  };

  const renderUpload = (upload: BloodTestUpload) => {
    const isExpanded = expandedId === upload.id;

    return (
      <AppCard key={upload.id}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setExpandedId(isExpanded ? null : upload.id)}
          style={({ pressed }) => [styles.uploadHeader, pressed && styles.pressed]}
        >
          <View style={styles.uploadIcon}>
            <Ionicons color={theme.colors.primary} name="document-text-outline" size={18} />
          </View>
          <View style={styles.uploadText}>
            <Text style={[styles.uploadTitle, upload.isHidden && styles.hiddenTitle]}>
              {upload.isHidden ? 'Hidden blood test' : 'Blood test'}
            </Text>
            <Text style={styles.uploadMeta}>
              {formatDateLabel(upload.createdAt)} · {STATUS_LABELS[upload.status] ?? upload.status}
            </Text>
          </View>
          {busyId === upload.id ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <>
              <IconButton
                icon={upload.isHidden ? 'eye-off-outline' : 'eye-outline'}
                label={upload.isHidden ? 'Show result' : 'Hide result'}
                disabled={busyId !== null}
                onPress={() => toggleVisibility(upload)}
              />
              <IconButton
                icon="trash-outline"
                label="Delete result"
                color={theme.colors.danger}
                disabled={busyId !== null}
                onPress={() => confirmDelete(upload)}
              />
            </>
          )}
          <Ionicons color={theme.colors.muted} name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
        </Pressable>

        {isExpanded ? <View style={styles.expandedContent}>{renderResults(upload)}</View> : null}
      </AppCard>
    );
  };

  const renderList = () => {
    if (failed) {
      return (
        <AppCard style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="cloud-offline-outline" size={28} />
          </View>
          <Text style={styles.stateText}>We couldn't load your blood tests. Please try again.</Text>
          <AppButton title="Try again" onPress={retry} variant="secondary" />
        </AppCard>
      );
    }

    if (uploads === undefined) {
      return <ActivityIndicator color={theme.colors.primary} size="large" style={styles.loading} />;
    }

    if (uploads.length === 0) {
      return (
        <AppCard style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="document-text-outline" size={28} />
          </View>
          <Text style={styles.stateText}>You haven't added a blood test yet. You can add one by restarting onboarding from your profile.</Text>
        </AppCard>
      );
    }

    return <View style={styles.list}>{uploads.map(renderUpload)}</View>;
  };

  return (
    <ScreenContainer>
      <SectionHeader title="Blood test results" subtitle="The reports you've added, and the results read from them." />

      <AppCard style={styles.warningCard}>
        <Text style={styles.warningTitle}>Medical disclaimer</Text>
        <Text style={styles.warningText}>{BLOOD_TEST_DISCLAIMER}</Text>
      </AppCard>

      {renderList()}
    </ScreenContainer>
  );
}

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  disabled: boolean;
  onPress: () => void;
}

function IconButton({ icon, label, color = theme.colors.muted, disabled, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, (pressed || disabled) && styles.pressed]}
    >
      <Ionicons color={color} name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: theme.spacing.xl,
  },
  warningCard: {
    backgroundColor: theme.colors.warningSurface,
  },
  warningTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  warningText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  stateCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  stateText: {
    color: theme.colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  list: {
    gap: theme.spacing.md,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  uploadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  uploadText: {
    flex: 1,
    gap: 2,
  },
  uploadTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  hiddenTitle: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  uploadMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  iconButton: {
    padding: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  expandedContent: {
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  tableGroup: {
    marginBottom: theme.spacing.md,
  },
  groupTitle: {
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tableHeaderCell: {
    fontWeight: '600',
    color: theme.colors.muted,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tableCell: {
    color: theme.colors.text,
    fontSize: 13,
  },
  testColumn: {
    flex: 2,
  },
  valueColumn: {
    flex: 1,
  },
  referenceCell: {
    color: theme.colors.muted,
  },
  noteText: {
    color: theme.colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
});