import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ButtonProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';

export const Button: React.FC<ButtonProps> = ({ label, onPress, variant = 'primary', disabled }) => {
    const backgroundColor = disabled
        ? '#ccc'
        : variant === 'primary'
            ? tokens.colors.primary
            : tokens.colors.secondary;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[styles.button, { backgroundColor }]}
        >
            <Text style={styles.text}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: tokens.spacing.s,
        paddingHorizontal: tokens.spacing.m,
        borderRadius: tokens.borderRadius.m,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: tokens.colors.background,
        fontSize: tokens.typography.fontSize.m,
        fontFamily: tokens.typography.fontFamily,
    },
});
