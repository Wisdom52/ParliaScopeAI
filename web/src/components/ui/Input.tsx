import React from 'react';
import { InputProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';

export const Input: React.FC<InputProps> = ({ value, onChangeText, placeholder, secureTextEntry }) => {
    return (
        <input
            type={secureTextEntry ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder={placeholder}
            style={{
                padding: tokens.spacing.s,
                borderRadius: tokens.borderRadius.s,
                border: `1px solid ${tokens.colors.text}`,
                fontSize: tokens.typography.fontSize.m,
                fontFamily: tokens.typography.fontFamily,
                width: '100%',
                boxSizing: 'border-box',
            }}
        />
    );
};
