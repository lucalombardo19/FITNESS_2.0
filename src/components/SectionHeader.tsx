import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon }) => (
  <View style={styles.container}>
    <View style={styles.row}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 20, marginRight: 8 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
});
