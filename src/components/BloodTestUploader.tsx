import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { theme } from '../theme/theme';
import { bloodTestService } from '../services/bloodTestService';

interface BloodTestUploaderProps {
  onUploadComplete?: () => void;
}

export function BloodTestUploader({ onUploadComplete }: BloodTestUploaderProps) {
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
        const file = result.assets[0];
        
        await bloodTestService.uploadBloodTest(
          file.uri,
          file.name,
          file.mimeType || 'application/octet-stream'
        );
        
        setUploaded(true);
        onUploadComplete?.();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <AppCard style={styles.successCard}>
        <Text style={styles.successText}>Blood test uploaded successfully!</Text>
      </AppCard>
    );
  }

  return (
    <View style={styles.container}>
      {uploading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <AppButton title="Select and Upload Document" onPress={handleSelectAndUpload} />
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
