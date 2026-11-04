import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl } from '../../components/SegmentedControl';
import { theme } from '../../theme/theme';
import { entryToText, formatBody, formatClock, formatDuration, splitUrl, statusColor, statusLabel } from './networkFormat';
import { NetworkEntry } from './networkLogStore';

type Tab = 'request' | 'response';

const TABS: { label: string; value: Tab }[] = [
  { label: 'Request', value: 'request' },
  { label: 'Response', value: 'response' },
];

const MONOSPACE = Platform.select({ ios: 'Menlo', default: 'monospace' });

interface NetworkEntryDetailProps {
  entry: NetworkEntry;
  onBack: () => void;
}

export function NetworkEntryDetail({ entry, onBack }: NetworkEntryDetailProps) {
  const [tab, setTab] = useState<Tab>('response');
  const { path } = splitUrl(entry.url);

  const headers = tab === 'request' ? entry.requestHeaders : entry.responseHeaders;
  const body = tab === 'request' ? entry.requestBody : entry.responseBody;
  const formattedBody = useMemo(() => (body ? formatBody(body) : undefined), [body]);

  const share = () => {
    Share.share({ message: entryToText(entry) }).catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.panel}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={8} onPress={onBack}>
          <Ionicons color={theme.colors.text} name="chevron-back" size={24} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {entry.method} {path}
        </Text>
        <Pressable accessibilityLabel="Share request" accessibilityRole="button" hitSlop={8} onPress={share}>
          <Ionicons color={theme.colors.text} name="share-outline" size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text selectable style={styles.url}>
            {entry.url}
          </Text>
          <Text style={styles.meta}>
            <Text style={[styles.status, { color: statusColor(entry) }]}>{statusLabel(entry)}</Text>
            {`  ·  ${formatClock(entry.startedAt)}`}
            {entry.durationMs != null ? `  ·  ${formatDuration(entry.durationMs)}` : ''}
          </Text>
          {entry.error ? (
            <Text selectable style={styles.error}>
              {entry.error}
            </Text>
          ) : null}
        </View>

        <SegmentedControl onChange={setTab} options={TABS} value={tab} />

        <Section title={`Headers (${headers.length})`}>
          {headers.length ? (
            headers.map(([name, value], index) => (
              <Text key={`${name}-${index}`} selectable style={styles.code}>
                <Text style={styles.headerName}>{name}: </Text>
                {value}
              </Text>
            ))
          ) : (
            <Text style={styles.placeholder}>None</Text>
          )}
        </Section>

        <Section title="Body">
          {formattedBody ? (
            <Text selectable style={styles.code}>
              {formattedBody}
            </Text>
          ) : (
            <Text style={styles.placeholder}>{bodyPlaceholder(entry, tab, body)}</Text>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function bodyPlaceholder(entry: NetworkEntry, tab: Tab, body: string | undefined) {
  if (body === '') {
    return 'Empty';
  }
  if (tab === 'request') {
    return 'None';
  }
  if (entry.state === 'pending') {
    return 'Waiting for response…';
  }
  return entry.state === 'failed' ? 'No response' : 'Reading body…';
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.text,
    fontWeight: '700',
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  url: {
    fontFamily: MONOSPACE,
    fontSize: 13,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  status: {
    fontWeight: '700',
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: MONOSPACE,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.text,
  },
  headerName: {
    color: theme.colors.muted,
  },
  placeholder: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
});
