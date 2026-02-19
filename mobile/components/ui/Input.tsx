import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { InputProps } from '@shared/ui/types';
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
    disabled
}) => {
    return (
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label} {required && <Text style={{ color: 'red' }}>*</Text>}
                </Text>
            )}
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
                onFocus={onFocus}
                onBlur={onBlur}
                editable={!disabled}
                style={[
                    styles.input,
                    disabled && { opacity: 0.6 },
                    error && { borderColor: 'red' }
                ]}
                placeholderTextColor="#999"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        color: '#1a1a1a',
    },
    input: {
        padding: tokens.spacing.s,
        borderRadius: tokens.borderRadius.s,
        borderWidth: 1,
        borderColor: tokens.colors.text,
        fontSize: tokens.typography.fontSize.m,
        fontFamily: tokens.typography.fontFamily,
        width: '100%',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    }
});
