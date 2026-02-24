import React from 'react';
import { ToastType } from '../../lib/ToastContext';
import { CheckCircle, AlertCircle, HelpCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ToastProps {
    toast: {
        id: string;
        type: ToastType;
        message: string;
        onConfirm?: () => void;
    };
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle color="#10b981" size={20} />;
            case 'error': return <AlertCircle color="#ff4d4f" size={20} />;
            case 'confirm': return <HelpCircle color="#0070f3" size={20} />;
        }
    };

    const getBorder = () => {
        switch (toast.type) {
            case 'success': return '1px solid #10b981';
            case 'error': return '1px solid #ff4d4f';
            case 'confirm': return '1px solid #0070f3';
        }
    };

    return (
        <div style={{
            backgroundColor: '#1a1a1a',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: getBorder(),
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'auto',
            animation: 'slideUp 0.3s ease-out forwards'
        }}>
            <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {getIcon()}
                    <span style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: '1.4' }}>{toast.message}</span>
                </div>

                {toast.type !== 'confirm' && (
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {toast.type === 'confirm' && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <Button variant="ghost" size="normal" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        size="normal"
                        onClick={() => {
                            toast.onConfirm?.();
                            onClose();
                        }}
                    >
                        Confirm
                    </Button>
                </div>
            )}
        </div>
    );
};
