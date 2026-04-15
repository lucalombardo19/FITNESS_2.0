import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface MacroBarProps {
  label: string;
  value: number;
  unit?: string;
  color: string;
  max?: number;
}

export const MacroBar: React.FC<MacroBarProps> = ({ label, value, unit = 'g', color, max = 300 }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{Math.round(value)}{unit}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: COLORS.textSecondary, fontSize: 13 },
  value: { fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
