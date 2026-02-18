import React from 'react';
import type { ButtonProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';

export const Button: React.FC<ButtonProps> = ({ label, onPress, variant = 'primary', disabled }) => {
    const backgroundColor = disabled
        ? '#ccc'
        : variant === 'primary'
            ? tokens.colors.primary
            : tokens.colors.secondary;

    return (
        <button
            onClick={onPress}
            disabled={disabled}
            style={{
                backgroundColor,
                color: tokens.colors.background,
                padding: `${tokens.spacing.s}px ${tokens.spacing.m}px`,
                borderRadius: tokens.borderRadius.m,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: tokens.typography.fontSize.m,
                fontFamily: tokens.typography.fontFamily,
            }}
        >
            {label}
        </button>
    );
};
