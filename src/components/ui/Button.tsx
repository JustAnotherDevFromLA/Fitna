import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'normal' | 'large' | 'massive'; // Fat-finger focused sizing
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'large',
    fullWidth = false,
    className = '',
    ...props
}) => {
    const customClasses = [
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className
    ].join(' ').trim();

    return (
        <button className={customClasses} {...props}>
            {children}
        </button>
    );
};
