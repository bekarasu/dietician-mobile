import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { LegalText } from '../features/legal/LegalText';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { LegalDocument } from '../types/models';
import { formatDateLabel } from '../utils/date';

// Shared by every stack that opens a document, as the screen has no back
// button of its own.
export const legalDocumentScreenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  title: '',
  headerTintColor: theme.colors.text,
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: { backgroundColor: theme.colors.surface },
  headerShadowVisible: false,
};

type LegalDocumentRoute = RouteProp<{ LegalDocument: { document: LegalDocument } }, 'LegalDocument'>;

// The full text of a legal document, opened from its checkbox.
export function LegalDocumentScreen() {
  const { document } = useRoute<LegalDocumentRoute>().params;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {document.title}
        </Text>
        <Text style={styles.meta}>
          {t('legal.meta', { version: document.version, date: formatDateLabel(document.publishedAt) })}
        </Text>
      </View>
      <AppCard>
        <LegalText content={document.content} />
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
    lineHeight: theme.typography.title.lineHeight,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 14,
  },
});
