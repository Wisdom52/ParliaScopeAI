export interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
}

export interface InputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
}

export interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children?: any;
}
