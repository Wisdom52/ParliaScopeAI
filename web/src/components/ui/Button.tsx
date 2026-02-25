import React from 'react';
import type { ButtonProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';

export const Button: React.FC<ButtonProps> = ({ label, onPress, variant = 'primary', disabled, loading }) => {
    const backgroundColor = disabled
        ? '#ccc'
        : variant === 'outline'
            ? 'transparent'
            : variant === 'primary'
                ? tokens.colors.primary
                : tokens.colors.secondary;

    const textColor = variant === 'outline' ? tokens.colors.primary : tokens.colors.background;
    const borderStyle = variant === 'outline' ? `1px solid ${tokens.colors.primary}` : 'none';

    return (
        <button
            onClick={onPress}
            disabled={disabled || loading}
            style={{
                backgroundColor,
                color: textColor,
                padding: `${tokens.spacing.s}px ${tokens.spacing.m}px`,
                borderRadius: tokens.borderRadius.m,
                border: borderStyle,
                cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
                fontSize: tokens.typography.fontSize.m,
                fontFamily: tokens.typography.fontFamily,
                opacity: (disabled || loading) ? 0.7 : 1,
            }}
        >
            {loading ? 'Processing...' : label}
        </button>
    );
};
