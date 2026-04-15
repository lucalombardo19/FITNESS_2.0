import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface ChipSelectProps {
  options: string[];
  labels?: Record<string, string>;
  selected: string[];
  onChange: (values: string[]) => void;
  multiSelect?: boolean;
}

export const ChipSelect: React.FC<ChipSelectProps> = ({ options, labels = {}, selected, onChange, multiSelect = true }) => {
  const toggle = (val: string) => {
    if (!multiSelect) { onChange([val]); return; }
    if (selected.includes(val)) onChange(selected.filter((s) => s !== val));
    else onChange([...selected, val]);
  };
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity key={opt} onPress={() => toggle(opt)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{labels[opt] ?? opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceVariant, margin: 4 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});
