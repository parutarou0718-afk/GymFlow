// ========================================
// GymFlow - Core UI Components
// ========================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TextInput as RNTextInput,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';

// ---- Button ----

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        isSecondary && styles.buttonSecondary,
        isGhost && styles.buttonGhost,
        isDanger && styles.buttonDanger,
        size === 'sm' && styles.buttonSm,
        size === 'lg' && styles.buttonLg,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isGhost || isSecondary ? colors.primary : colors.textInverse}
          size="small"
        />
      ) : (
        <>
          {icon && <View style={{ marginRight: spacing.sm }}>{icon}</View>}
          <Text
            style={[
              styles.buttonText,
              isPrimary && styles.buttonTextPrimary,
              isSecondary && styles.buttonTextSecondary,
              isGhost && styles.buttonTextGhost,
              isDanger && styles.buttonTextDanger,
              size === 'sm' && styles.buttonTextSm,
              size === 'lg' && styles.buttonTextLg,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ---- Card ----

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.card, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---- Section Header ----

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={typography.h3}>{title}</Text>
        {subtitle && <Text style={[typography.bodySmall, { marginTop: 2 }]}>{subtitle}</Text>}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---- Divider ----

interface DividerProps {
  style?: ViewStyle;
}

export function Divider({ style }: DividerProps) {
  return <View style={[styles.divider, style]} />;
}

// ---- Status Badge ----

interface BadgeProps {
  label: string;
  variant?: 'active' | 'completed' | 'paused' | 'draft' | 'info';
}

export function Badge({ label, variant = 'info' }: BadgeProps) {
  const badgeStyles: Record<string, any> = {
    active: { bg: colors.primaryBg, text: colors.primaryLight },
    completed: { bg: colors.accentBg, text: colors.accent },
    paused: { bg: colors.warningBg, text: colors.warning },
    draft: { bg: 'rgba(161, 161, 170, 0.1)', text: colors.textTertiary },
    info: { bg: 'rgba(161, 161, 170, 0.1)', text: colors.textSecondary },
  };

  const s = badgeStyles[variant] || badgeStyles.info;

  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{label}</Text>
    </View>
  );
}

// ---- Empty State ----

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      {icon && <Text style={styles.emptyIcon}>{icon}</Text>}
      <Text style={[typography.h3, { textAlign: 'center' }]}>{title}</Text>
      {subtitle && (
        <Text style={[typography.bodySmall, { textAlign: 'center', marginTop: spacing.sm }]}>
          {subtitle}
        </Text>
      )}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          size="sm"
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );
}

// ---- Metric Display ----

interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  style?: ViewStyle;
}

export function Metric({ label, value, unit, style }: MetricProps) {
  return (
    <View style={[styles.metric, style]}>
      <Text style={[typography.number, { color: colors.primary }]}>{value}</Text>
      {unit && <Text style={[typography.caption, { marginTop: 2 }]}>{unit}</Text>}
      <Text style={[typography.caption, { marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

// ---- Input ----

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  editable?: boolean;
  style?: ViewStyle;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable = true,
  style,
}: InputProps) {
  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={[typography.label, { marginBottom: spacing.sm }]}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );
}

// ---- Screen Container ----

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safe?: boolean;
}

export function ScreenContainer({ children, style }: ScreenProps) {
  return (
    <View style={[styles.screen, style]}>
      {children}
    </View>
  );
}

// ---- Sheet / Modal Header ----

interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  rightAction?: { label: string; onPress: () => void };
}

export function SheetHeader({ title, onClose, rightAction }: SheetHeaderProps) {
  return (
    <View style={styles.sheetHeader}>
      <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
        <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
      </TouchableOpacity>
      <Text style={typography.h3}>{title}</Text>
      {rightAction ? (
        <TouchableOpacity onPress={rightAction.onPress} style={styles.sheetRight}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{rightAction.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

// ========================================
// Styles
// ========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.xl,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGhost: {
    backgroundColor: colors.transparent,
  },
  buttonDanger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonSm: {
    height: 36,
    paddingHorizontal: spacing.lg,
  },
  buttonLg: {
    height: 56,
    paddingHorizontal: spacing['2xl'],
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: colors.textInverse,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  buttonTextGhost: {
    color: colors.primary,
  },
  buttonTextDanger: {
    color: colors.danger,
  },
  buttonTextSm: {
    fontSize: 14,
  },
  buttonTextLg: {
    fontSize: 18,
  },

  // Card
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Badge
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },

  // Metric
  metric: {
    alignItems: 'center',
  },

  // Input
  inputContainer: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    height: 48,
  },
  inputDisabled: {
    opacity: 0.6,
  },

  // Sheet Header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRight: {
    width: 40,
    alignItems: 'flex-end',
  },
});
