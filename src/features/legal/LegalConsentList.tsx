import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../i18n';
import { theme } from '../../theme/theme';
import { LegalDocument } from '../../types/models';

export type LegalChecks = Record<string, boolean>;

// Whether every required document is ticked. Checks are keyed by version id,
// so a newer version comes up unticked.
export function hasAcceptedRequired(documents: LegalDocument[], checked: LegalChecks) {
  return documents.every((document) => !document.isRequired || checked[document.id]);
}

export function acceptedDocuments(documents: LegalDocument[], checked: LegalChecks) {
  return documents.filter((document) => checked[document.id]);
}

interface LegalConsentListProps {
  documents: LegalDocument[];
  checked: LegalChecks;
  onToggle: (id: string) => void;
  onOpen: (document: LegalDocument) => void;
  // Set when the user tried to continue without a required document.
  showMissing?: boolean;
}

// A checkbox per document, with its wording from the server and a link to the
// full text.
export function LegalConsentList({ documents, checked, onToggle, onOpen, showMissing = false }: LegalConsentListProps) {
  return (
    <View style={styles.list}>
      {documents.map((document) => {
        const isChecked = Boolean(checked[document.id]);
        const isMissing = showMissing && document.isRequired && !isChecked;
        const label = document.consentLabel || document.title;

        return (
          <View key={document.id} style={styles.row}>
            <Pressable
              accessibilityLabel={document.isRequired ? label : t('legal.optionalA11y', { label })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              hitSlop={6}
              onPress={() => onToggle(document.id)}
              style={styles.toggle}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked, isMissing && styles.checkboxMissing]}>
                {isChecked ? <Ionicons color={theme.colors.surface} name="checkmark" size={16} /> : null}
              </View>
              <Text style={styles.label}>
                {label}
                {document.isRequired ? null : <Text style={styles.optional}>{'  '}{t('legal.optional')}</Text>}
              </Text>
            </Pressable>
            <Pressable
              accessibilityHint={t('legal.openHint')}
              accessibilityLabel={t('legal.read', { title: document.title })}
              accessibilityRole="link"
              hitSlop={6}
              onPress={() => onOpen(document)}
              style={({ pressed }) => [styles.readLink, pressed && styles.pressed]}
            >
              <Text style={styles.readText}>{t('legal.read', { title: document.title })}</Text>
              <Ionicons color={theme.colors.primary} name="chevron-forward" size={14} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const CHECKBOX_SIZE = 24;

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  row: {
    gap: theme.spacing.xs,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxMissing: {
    borderColor: theme.colors.danger,
  },
  label: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  optional: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  readLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginLeft: CHECKBOX_SIZE + theme.spacing.sm,
  },
  readText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
