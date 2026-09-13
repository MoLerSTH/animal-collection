import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  PressableProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline';

interface CustomButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function CustomButton({
  label,
  variant = 'primary',
  loading = false,
  icon,
  fullWidth = true,
  disabled,
  ...pressableProps
}: CustomButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      style={[
        styles.button,
        VARIANT_BUTTON_STYLES[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#3A2E2B'} />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              VARIANT_TEXT_STYLES[variant],
              icon ? styles.textWithIcon : undefined,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  buttonPrimary: {
    backgroundColor: '#3A2E2B',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(196, 164, 132, 0.4)',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(58, 46, 43, 0.2)',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#3A2E2B',
  },
  textOutline: {
    color: '#3A2E2B',
  },
  textWithIcon: {
    marginLeft: 8,
  },
});

const VARIANT_BUTTON_STYLES: Record<Variant, ViewStyle> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  outline: styles.buttonOutline,
};

const VARIANT_TEXT_STYLES: Record<Variant, TextStyle> = {
  primary: styles.textPrimary,
  secondary: styles.textSecondary,
  outline: styles.textOutline,
};
