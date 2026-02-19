import React from 'react';
import type { InputProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';

export const Input: React.FC<InputProps> = ({
    value,
    onChangeText,
    placeholder,
    label,
    required,
    error,
    secureTextEntry,
    onFocus,
    onBlur,
    onKeyDown,
    disabled
}) => {
    return (
        <div style={{ width: '100%', marginBottom: '0.5rem' }}>
            {label && (
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                    {label} {required && <span style={{ color: 'red' }}>*</span>}
                </label>
            )}
            <input
                type={secureTextEntry ? 'password' : 'text'}
                value={value}
                onChange={(e) => onChangeText(e.target.value)}
                placeholder={placeholder}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                disabled={disabled}
                style={{
                    padding: tokens.spacing.s,
                    borderRadius: tokens.borderRadius.s,
                    border: `1px solid ${error ? 'red' : tokens.colors.text}`,
                    fontSize: tokens.typography.fontSize.m,
                    fontFamily: tokens.typography.fontFamily,
                    width: '100%',
                    boxSizing: 'border-box',
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'text',
                    outlineColor: error ? 'red' : 'var(--primary)',
                }}
            />
            {error && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px', marginBottom: 0 }}>{error}</p>}
        </div>
    );
};
