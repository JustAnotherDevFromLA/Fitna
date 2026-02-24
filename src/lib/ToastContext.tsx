"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from '../components/ui/Toast';

export type ToastType = 'success' | 'error' | 'confirm';

interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    onConfirm?: () => void;
}

interface ToastContextType {
    success: (message: string) => void;
    error: (message: string) => void;
    confirm: (message: string, onConfirm: () => void) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, onConfirm?: () => void) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message, onConfirm }]);

        // Auto-remove success/error after 3s
        if (type !== 'confirm') {
            setTimeout(() => {
                removeToast(id);
            }, 3000);
        }
    }, [removeToast]);

    const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
    const error = useCallback((msg: string) => addToast('error', msg), [addToast]);
    const confirm = useCallback((msg: string, cb: () => void) => addToast('confirm', msg, cb), [addToast]);

    return (
        <ToastContext.Provider value={{ success, error, confirm, removeToast }}>
            {children}
            <div
                style={{
                    position: 'fixed',
                    bottom: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    pointerEvents: 'none',
                    width: '90%',
                    maxWidth: '400px'
                }}
            >
                {toasts.map(t => (
                    <Toast
                        key={t.id}
                        toast={t}
                        onClose={() => removeToast(t.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
