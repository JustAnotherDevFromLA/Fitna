import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'small' | 'normal' | 'large' | 'massive';
    fullWidth?: boolean;
    children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    variant = 'primary',
    size = 'normal',
    fullWidth = false,
    className = '',
    children, // Destructure children here as it's explicitly in ButtonProps
    ...props
}, ref) => {
    const customClasses = [
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className
    ].join(' ').trim();

    return (
        <button className={customClasses} {...props} ref={ref}>
            {children}
        </button>
    );
});
Button.displayName = 'Button';
