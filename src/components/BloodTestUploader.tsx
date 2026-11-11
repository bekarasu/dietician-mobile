import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { bloodTestService } from '../services/bloodTestService';
import { BloodTestUpload } from '../types/models';

interface BloodTestUploaderProps {
  onUploadComplete?: (upload: BloodTestUpload) => void;
  onUploadStateChange?: (uploading: boolean) => void;
}

export function BloodTestUploader({ onUploadComplete, onUploadStateChange }: BloodTestUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleSelectAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        onUploadStateChange?.(true);
        const file = result.assets[0];
        
        const upload = await bloodTestService.uploadBloodTest(
          file.uri,
          file.name,
          file.mimeType || 'application/octet-stream'
        );
        
        setUploaded(true);
        onUploadComplete?.(upload);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
    }
  };

  if (uploaded) {
    return (
      <AppCard style={styles.successCard}>
        <Text style={styles.successText}>{t('components.bloodTestUploader.success')}</Text>
      </AppCard>
    );
  }

  return (
    <View style={styles.container}>
      {uploading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <AppButton title={t('components.bloodTestUploader.select')} onPress={handleSelectAndUpload} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  successCard: {
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  successText: {
    color: theme.colors.primary,
    fontWeight: '700',
  }
});
