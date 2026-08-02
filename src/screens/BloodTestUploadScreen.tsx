import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

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
  const [uploads, setUploads] = useState<BloodTestUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUploads();
  }, []);

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

  const handleSelectAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const file = result.assets[0];
        
        const upload = await bloodTestService.uploadBloodTest(
          file.uri,
          file.name,
          file.mimeType || 'application/octet-stream'
        );
        
        setUploads((current) => [upload, ...current]);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Blood test upload"
        subtitle="This remains intentionally narrow. Production versions should include encryption, retention rules, access controls, and explicit medical disclaimers."
      />

      <AppCard style={styles.warningCard}>
        <Text style={styles.warningTitle}>Medical disclaimer</Text>
        <Text style={styles.warningText}>{BLOOD_TEST_DISCLAIMER}</Text>
      </AppCard>

      <AppCard style={styles.formCard}>
        {uploading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <AppButton title="Select and Upload Document" onPress={handleSelectAndUpload} />
        )}
      </AppCard>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        uploads.map((upload) => (
          <AppCard key={upload.id} style={styles.uploadCard}>
            <Text style={styles.uploadTitle}>Blood Test Report</Text>
            <Text style={styles.uploadMeta}>
              {upload.uploadedAt ? formatDateLabel(upload.uploadedAt) : 'Recent'} · {upload.status}
            </Text>
          </AppCard>
        ))
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
  uploadMeta: {
    color: theme.colors.muted,
  },
  loader: {
    marginTop: theme.spacing.xl,
  }
});