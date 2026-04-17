import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  icon?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, unit, color = COLORS.primary, icon }) => (
  <View style={[styles.card, { borderTopColor: color }]}>
    {icon ? <Text style={styles.icon}>{icon}</Text> : null}
    <Text style={[styles.value, { color }]}>
      {value}{unit ? <Text style={styles.unit}> {unit}</Text> : null}
    </Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surfaceVariant, borderRadius: 12, padding: 14, alignItems: 'center', flex: 1, marginHorizontal: 4, borderTopWidth: 3 },
  icon: { fontSize: 20, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 12, fontWeight: '500' },
  label: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'center' },
});
