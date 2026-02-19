export interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    loading?: boolean;
}

export interface InputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    error?: string;
    secureTextEntry?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    onKeyDown?: (e: any) => void;
    disabled?: boolean;
}

export interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children?: any;
}
