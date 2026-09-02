import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { BLOOD_TEST_DISCLAIMER } from '../constants/health';
import { bloodTestService } from '../services/bloodTestService';
import { theme } from '../theme/theme';
import { BloodTestUpload } from '../types/models';
import { formatDateLabel } from '../utils/date';

export function BloodTestUploadScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [uploads, setUploads] = useState<BloodTestUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUploadId, setExpandedUploadId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadDetails, setUploadDetails] = useState<Record<string, BloodTestUpload>>({});

  const toggleExpand = async (id: string) => {
    if (expandedUploadId === id) {
      setExpandedUploadId(null);
      return;
    }

    setExpandedUploadId(id);

    if (!uploadDetails[id]) {
      setDetailLoading(true);
      try {
        const detail = await bloodTestService.getUploadDetail(id);
        setUploadDetails(prev => ({ ...prev, [id]: detail.upload }));
      } catch (error) {
        console.error('Failed to load upload detail:', error);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const handleToggleVisibility = async (id: string, isHidden: boolean) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!isEnrolled) {
        Alert.alert(
          'Security Requirement',
          'You must set up a screen lock or biometrics on your device to use this feature.'
        );
        return;
      }

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: isHidden ? 'Authenticate to unhide result' : 'Authenticate to hide result',
          fallbackLabel: 'Use Passcode',
        });

        if (!result.success) {
          return;
        }
      }

      setUploads(current => current.map(u => u.id === id ? { ...u, isHidden: !isHidden } : u));
      await bloodTestService.toggleVisibility(id, !isHidden);
    } catch (error: any) {
      console.error('Failed to toggle visibility:', error);
      Alert.alert('Error', `Failed to toggle visibility: ${error.message || String(error)}`);
      setUploads(current => current.map(u => u.id === id ? { ...u, isHidden: isHidden } : u));
    }
  };

  const handleDeleteUpload = (id: string) => {
    Alert.alert(
      'Delete Result',
      'Are you sure you want to completely remove this blood test result?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const hasHardware = await LocalAuthentication.hasHardwareAsync();
              const isEnrolled = await LocalAuthentication.isEnrolledAsync();

              if (!isEnrolled) {
                Alert.alert(
                  'Security Requirement',
                  'You must set up a screen lock or biometrics on your device to use this feature.'
                );
                return;
              }

              if (hasHardware && isEnrolled) {
                const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: 'Authenticate to delete result',
                  fallbackLabel: 'Use Passcode',
                });

                if (!result.success) {
                  return;
                }
              }

              await bloodTestService.deleteUpload(id);
              setUploads(current => current.filter(u => u.id !== id));
            } catch (error: any) {
              console.error('Failed to delete upload:', error);
              Alert.alert('Error', `Failed to delete upload: ${error.message || String(error)}`);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setAuthChecking(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!isEnrolled) {
        Alert.alert(
          'Security Warning',
          'No screen lock detected. Please set up a device passcode or biometric lock in your phone settings to protect your health data.'
        );
        setIsAuthenticated(false);
        setAuthChecking(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view blood test results',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setIsAuthenticated(true);
        loadUploads();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const loadUploads = async () => {
    try {
      const data = await bloodTestService.listUploads();
      setUploads(data);
    } catch (error) {
      console.error('Failed to load uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <SectionHeader
          title="Protected Content"
          subtitle="Authentication is required to view your blood test results."
        />
        <AppCard style={styles.formCard}>
          <Text style={styles.warningTitle}>Locked</Text>
          <Text style={[styles.warningText, { textAlign: 'center', marginBottom: theme.spacing.md }]}>
            Your health data is protected for your security.
          </Text>
          <AppButton title="Unlock" onPress={checkAuth} />
        </AppCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Blood test results"
        subtitle="Manage your uploaded blood test results."
      />

      <AppCard style={styles.warningCard}>
        <Text style={styles.warningTitle}>Medical disclaimer</Text>
        <Text style={styles.warningText}>{BLOOD_TEST_DISCLAIMER}</Text>
      </AppCard>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.listContainer}>
          {uploads.map((upload) => {
            const isExpanded = expandedUploadId === upload.id;
            const displayData = uploadDetails[upload.id] || upload;
            return (
              <TouchableOpacity key={upload.id} onPress={() => toggleExpand(upload.id)} activeOpacity={0.8}>
                <AppCard style={styles.uploadCard}>
                  <View style={styles.uploadHeader}>
                    <View>
                      <Text style={[styles.uploadTitle, upload.isHidden && styles.hiddenTitle]}>
                        Blood Test Report {upload.isHidden ? '(Hidden)' : ''}
                      </Text>
                      <Text style={styles.uploadMeta}>
                        {upload.uploadedAt ? formatDateLabel(upload.uploadedAt) : 'Recent'} · {upload.status}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteUpload(upload.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(upload.id, upload.isHidden);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={{ fontSize: 16 }}>{upload.isHidden ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                      <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {upload.isHidden ? (
                        <Text style={styles.noDataText}>This result is hidden. Unhide it to view details.</Text>
                      ) : detailLoading && !uploadDetails[upload.id] ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: theme.spacing.md }} />
                      ) : displayData.parsedResults?.testGroups && displayData.parsedResults.testGroups.length > 0 ? (
                        displayData.parsedResults.testGroups.map((group, gIdx) => (
                          <View key={gIdx} style={styles.tableGroup}>
                            {group.groupName ? <Text style={styles.groupTitle}>{group.groupName}</Text> : null}
                            <View style={styles.tableHeader}>
                              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Test</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Result</Text>
                              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Ref</Text>
                            </View>
                            {group.tests.map((test, tIdx) => (
                              <View key={tIdx} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>{test.testName}</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>{test.result} {test.resultUnit}</Text>
                                <Text style={[styles.tableCell, { flex: 1, color: theme.colors.muted }]}>{test.referenceValue}</Text>
                              </View>
                            ))}
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noDataText}>No extracted data available for this report.</Text>
                      )}
                    </View>
                  )}
                </AppCard>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  formCard: {
    gap: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  uploadCard: {
    gap: theme.spacing.xs,
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
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  listContainer: {
    gap: theme.spacing.md,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: theme.colors.muted,
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
  noDataText: {
    color: theme.colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  }
});