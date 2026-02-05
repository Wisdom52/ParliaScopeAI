import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { InputProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';

export const Input: React.FC<InputProps> = ({ value, onChangeText, placeholder, secureTextEntry }) => {
    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            style={styles.input}
            placeholderTextColor="#999"
        />
    );
};

const styles = StyleSheet.create({
    input: {
        padding: tokens.spacing.s,
        borderRadius: tokens.borderRadius.s,
        borderWidth: 1,
        borderColor: tokens.colors.text,
        fontSize: tokens.typography.fontSize.m,
        fontFamily: tokens.typography.fontFamily,
        width: '100%',
    },
});
