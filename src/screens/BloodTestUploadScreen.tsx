import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { BLOOD_TEST_DISCLAIMER } from '../constants/health';
import { bloodTestService } from '../services/bloodTestService';
import { theme } from '../theme/theme';
import { BloodTestUpload } from '../types/models';
import { formatDateLabel } from '../utils/date';

export function BloodTestUploadScreen() {
  const [fileName, setFileName] = useState('blood-panel-march.pdf');
  const [uploads, setUploads] = useState<BloodTestUpload[]>([]);

  const createPlaceholderUpload = async () => {
    const upload = await bloodTestService.createPlaceholderUpload(fileName || 'untitled-report.pdf');
    setUploads((current) => [upload, ...current]);
    setFileName('');
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
        <AppTextInput label="Placeholder file name" onChangeText={setFileName} value={fileName} placeholder="blood-panel.pdf" />
        <AppButton title="Simulate upload" onPress={createPlaceholderUpload} />
      </AppCard>

      {uploads.map((upload) => (
        <AppCard key={upload.id} style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>{upload.fileName}</Text>
          <Text style={styles.uploadMeta}>{formatDateLabel(upload.uploadedAt)} · {upload.status}</Text>
          <Text style={styles.uploadNote}>{upload.note}</Text>
        </AppCard>
      ))}
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
  uploadNote: {
    color: theme.colors.text,
    lineHeight: 22,
  },
});