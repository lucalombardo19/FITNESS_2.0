import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'primary' | 'accent' | 'danger';
}

const variantColors: Record<string, string> = {
  default: COLORS.surfaceVariant,
  primary: '#1E1A4A',
  accent: '#0D3830',
  danger: '#3A0D1A',
};

export const GradientCard: React.FC<Props> = ({ children, style, variant = 'default' }) => (
  <View style={[styles.card, { backgroundColor: variantColors[variant] }, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
});
