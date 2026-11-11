import { useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { t } from '../../i18n';
import { theme } from '../../theme/theme';
import { ProgressEntry } from '../../types/models';
import { formatDateTimeLabel } from '../../utils/date';
import { formatDate, formatKg } from '../../utils/formatters';

const MAX_POINTS = 10;
const HEIGHT = 180;
const PADDING = { top: 10, right: 10, bottom: 26, left: 40 };
// In kg, smallest first. The first that covers the range in four steps is used.
const TICK_STEPS = [0.5, 1, 2, 5, 10, 20, 50];

const round = (value: number) => Number(value.toFixed(1));

// Clean ticks around the readings, at least two steps apart so a flat line
// doesn't sit on the edge of the chart.
function getTicks(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = TICK_STEPS.find((candidate) => (max - min) / candidate <= 4) ?? TICK_STEPS[TICK_STEPS.length - 1];
  let low = round(Math.floor(min / step) * step);
  let high = round(Math.ceil(max / step) * step);
  if (high - low < step * 2) {
    low = round(low - step);
  }
  if (high - low < step * 2) {
    high = round(high + step);
  }

  const count = Math.round((high - low) / step);
  const ticks = Array.from({ length: count + 1 }, (_, index) => round(low + index * step));
  return { ticks, low, high, decimals: step < 1 ? 1 : 0 };
}

// The latest weigh-ins as a line, evenly spaced. Tapping picks the nearest one
// to read. Needs at least two entries, oldest first.
export function WeightTrendChart({ entries }: { entries: ProgressEntry[] }) {
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const points = entries.slice(-MAX_POINTS);
  if (points.length < 2) {
    return null;
  }

  const foundIndex = points.findIndex((entry) => entry.id === selectedId);
  const selectedIndex = foundIndex === -1 ? points.length - 1 : foundIndex;
  const selected = points[selectedIndex];

  const { ticks, low, high, decimals } = getTicks(points.map((entry) => entry.weightKg));
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const x = (index: number) => PADDING.left + (index * plotWidth) / (points.length - 1);
  const y = (weightKg: number) => PADDING.top + ((high - weightKg) / (high - low)) * plotHeight;
  const path = points.map((entry, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(entry.weightKg)}`).join(' ');

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const select = (event: GestureResponderEvent) => {
    const index = Math.round(((event.nativeEvent.locationX - PADDING.left) / plotWidth) * (points.length - 1));
    setSelectedId(points[Math.min(Math.max(index, 0), points.length - 1)].id);
  };

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('progress.chart.trend')}</Text>
          <Text style={styles.caption}>{t('progress.chart.lastWeighIns', { count: points.length })}</Text>
        </View>
        <View style={styles.readout}>
          <Text style={styles.readoutValue}>{formatKg(selected.weightKg)}</Text>
          <Text style={styles.caption}>{formatDateTimeLabel(selected.date)}</Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel={t('progress.chart.a11y', { from: formatKg(first.weightKg), fromDate: formatDate(first.date), to: formatKg(last.weightKg), toDate: formatDate(last.date) })}
        onLayout={onLayout}
        onPress={select}
        style={styles.chart}
      >
        {width > 0 ? (
          // Touches go to the Pressable, so locationX is measured from its edge.
          <View style={styles.noTouch}>
            <Svg width={width} height={HEIGHT}>
              {ticks.map((tick) => (
                <Line
                  key={tick}
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={theme.colors.border}
                  strokeWidth={1}
                />
              ))}
              {ticks.map((tick) => (
                <SvgText
                  key={`label-${tick}`}
                  x={PADDING.left - 8}
                  y={y(tick) + 4}
                  fill={theme.colors.muted}
                  fontSize={11}
                  textAnchor="end"
                >
                  {tick.toFixed(decimals)}
                </SvgText>
              ))}
              <Line
                x1={x(selectedIndex)}
                x2={x(selectedIndex)}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                stroke={theme.colors.border}
                strokeWidth={1}
              />
              <Path d={path} fill="none" stroke={theme.colors.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {points.map((entry, index) => (
                <Circle
                  key={entry.id}
                  cx={x(index)}
                  cy={y(entry.weightKg)}
                  r={index === selectedIndex ? 6 : 4}
                  fill={theme.colors.primary}
                  stroke={theme.colors.surface}
                  strokeWidth={2}
                />
              ))}
              <SvgText x={PADDING.left} y={HEIGHT - 6} fill={theme.colors.muted} fontSize={11} textAnchor="start">
                {formatDate(first.date)}
              </SvgText>
              <SvgText x={width - PADDING.right} y={HEIGHT - 6} fill={theme.colors.muted} fontSize={11} textAnchor="end">
                {formatDate(last.date)}
              </SvgText>
            </Svg>
          </View>
        ) : null}
      </Pressable>
      <Text style={styles.caption}>{t('progress.chart.tapHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  caption: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  readout: {
    alignItems: 'flex-end',
    gap: 2,
  },
  readoutValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  chart: {
    height: HEIGHT,
  },
  noTouch: {
    pointerEvents: 'none',
  },
});
