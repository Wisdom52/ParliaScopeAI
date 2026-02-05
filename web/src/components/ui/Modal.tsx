import React from 'react';
import { ModalProps } from '@shared/ui/types';
import { tokens } from '@shared/tokens';
import { Button } from './Button';

export const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children }) => {
    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                backgroundColor: tokens.colors.background,
                padding: tokens.spacing.l,
                borderRadius: tokens.borderRadius.l,
                minWidth: '300px',
                maxWidth: '90%',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tokens.spacing.m }}>
                    <h3 style={{ margin: 0, fontFamily: tokens.typography.fontFamily }}>{title}</h3>
                    <Button label="X" onPress={onClose} variant="secondary" />
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};
