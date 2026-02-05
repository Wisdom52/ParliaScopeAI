import React from 'react';
import { Modal as RNModal, View, Text, StyleSheet } from 'react-native';
import { ModalProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';
import { Button } from './Button';

export const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children }) => {
    return (
        <RNModal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <Button label="X" onPress={onClose} variant="secondary" />
                    </View>
                    <View>{children}</View>
                </View>
            </View>
        </RNModal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: tokens.colors.background,
        padding: tokens.spacing.l,
        borderRadius: tokens.borderRadius.l,
        width: '80%',
        maxWidth: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.spacing.m,
    },
    title: {
        fontSize: tokens.typography.fontSize.l,
        fontWeight: 'bold',
        fontFamily: tokens.typography.fontFamily,
    },
});
