import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../theme/theme';
import { EnvironmentCard } from './EnvironmentCard';
import { NetworkEntryDetail } from './NetworkEntryDetail';
import { formatClock, formatDuration, isFailure, splitUrl, statusColor, statusLabel } from './networkFormat';
import { NetworkEntry, useNetworkLogStore } from './networkLogStore';

const BUBBLE_SIZE = 48;
const EDGE_MARGIN = 12;
const DRAG_THRESHOLD = 4;

// Shown when the env turns monitoring on (appEnv.monitoring). Requests are
// recorded by installNetworkLogger; this only shows them, from a draggable
// bubble that floats over every screen.
export function NetworkInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // The Android back button leaves the detail view before closing the log.
  const handleRequestClose = () => {
    if (selectedId != null) {
      setSelectedId(null);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      <InspectorBubble onPress={() => setIsOpen(true)} />
      <Modal animationType="slide" onRequestClose={handleRequestClose} visible={isOpen}>
        {/* The Modal is a separate native window and needs its own insets. */}
        <SafeAreaProvider>
          <NetworkLogPanel onClose={() => setIsOpen(false)} onSelect={setSelectedId} selectedId={selectedId} />
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

function InspectorBubble({ onPress }: { onPress: () => void }) {
  const count = useNetworkLogStore((state) => state.entries.length);
  const hasFailures = useNetworkLogStore((state) => state.entries.some(isFailure));
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const restingPosition = useRef({ x: width - BUBBLE_SIZE - EDGE_MARGIN, y: height * 0.6 });
  const position = useRef(new Animated.ValueXY(restingPosition.current)).current;

  const panResponder = useMemo(() => {
    const settle = (dx: number, dy: number) => {
      const { x, y } = restingPosition.current;
      // Snap to the nearest side so the bubble stays out of the content.
      const nextX = x + dx + BUBBLE_SIZE / 2 < width / 2 ? EDGE_MARGIN : width - BUBBLE_SIZE - EDGE_MARGIN;
      const minY = insets.top + EDGE_MARGIN;
      const maxY = height - insets.bottom - BUBBLE_SIZE - EDGE_MARGIN;
      restingPosition.current = { x: nextX, y: Math.min(Math.max(y + dy, minY), maxY) };
      Animated.spring(position, { toValue: restingPosition.current, useNativeDriver: false }).start();
    };

    // Small movements stay a tap on the Pressable below.
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD,
      onPanResponderMove: (_, gesture) =>
        position.setValue({ x: restingPosition.current.x + gesture.dx, y: restingPosition.current.y + gesture.dy }),
      onPanResponderRelease: (_, gesture) => settle(gesture.dx, gesture.dy),
      onPanResponderTerminate: (_, gesture) => settle(gesture.dx, gesture.dy),
    });
  }, [height, insets.bottom, insets.top, position, width]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.bubble, { transform: position.getTranslateTransform() }]}
    >
      <Pressable
        accessibilityLabel="Open network inspector"
        accessibilityRole="button"
        onPress={onPress}
        style={styles.bubbleButton}
      >
        <Ionicons color={theme.colors.surface} name="swap-vertical" size={22} />
      </Pressable>
      {count > 0 ? (
        <View style={[styles.badge, hasFailures ? styles.badgeFailed : undefined]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

interface NetworkLogPanelProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onClose: () => void;
}

function NetworkLogPanel({ selectedId, onSelect, onClose }: NetworkLogPanelProps) {
  const entries = useNetworkLogStore((state) => state.entries);
  const clear = useNetworkLogStore((state) => state.clear);
  const [query, setQuery] = useState('');

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return entries;
    }
    return entries.filter((entry) =>
      `${entry.method} ${statusLabel(entry)} ${entry.url}`.toLowerCase().includes(needle),
    );
  }, [entries, query]);

  // Read from the store on every render so a body that arrives later shows up.
  const selected = selectedId != null ? entries.find((entry) => entry.id === selectedId) : undefined;

  if (selected) {
    return <NetworkEntryDetail entry={selected} onBack={() => onSelect(null)} />;
  }

  return (
    <SafeAreaView style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Network</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={clear}>
          <Text style={styles.headerAction}>Clear</Text>
        </Pressable>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={8} onPress={onClose}>
          <Ionicons color={theme.colors.text} name="close" size={24} />
        </Pressable>
      </View>

      <EnvironmentCard />

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={setQuery}
        placeholder="Filter by URL, method or status"
        placeholderTextColor={theme.colors.muted}
        style={styles.search}
        value={query}
      />

      <FlatList
        contentContainerStyle={styles.list}
        data={visibleEntries}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(entry) => String(entry.id)}
        ListEmptyComponent={<Text style={styles.empty}>{entries.length ? 'No matches.' : 'No requests yet.'}</Text>}
        renderItem={({ item }) => <NetworkEntryRow entry={item} onPress={() => onSelect(item.id)} />}
      />
    </SafeAreaView>
  );
}

function NetworkEntryRow({ entry, onPress }: { entry: NetworkEntry; onPress: () => void }) {
  const { host, path } = splitUrl(entry.url);
  const duration = entry.durationMs != null ? `  ·  ${formatDuration(entry.durationMs)}` : '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : undefined]}>
      <View style={styles.rowLine}>
        <Text style={styles.method}>{entry.method}</Text>
        <Text style={[styles.status, { color: statusColor(entry) }]}>{statusLabel(entry)}</Text>
        <Text numberOfLines={1} style={styles.path}>
          {path}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.meta}>
        {`${host}  ·  ${formatClock(entry.startedAt)}${duration}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
  },
  bubbleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.text,
    opacity: 0.85,
    ...theme.shadows.card,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primary,
    pointerEvents: 'none',
  },
  badgeFailed: {
    backgroundColor: theme.colors.danger,
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  panel: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    flex: 1,
    color: theme.colors.text,
  },
  headerAction: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  search: {
    ...theme.typography.body,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.sm,
    gap: 2,
  },
  rowPressed: {
    backgroundColor: theme.colors.secondarySurface,
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  method: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  status: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  path: {
    ...theme.typography.caption,
    flex: 1,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
});
