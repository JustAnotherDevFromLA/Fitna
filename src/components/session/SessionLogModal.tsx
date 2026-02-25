"use client";

import React from 'react';
import { X } from 'lucide-react';
import { SessionLogEditor } from './SessionLogEditor';

interface SessionLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId?: string | null;
    dateParam?: string | null;
    timeParam?: string | null;
    exercisesParam?: string | null;
    nameParam?: string | null;
}

export function SessionLogModal({
    isOpen,
    onClose,
    sessionId,
    dateParam,
    timeParam,
    exercisesParam,
    nameParam
}: SessionLogModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'var(--background)', zIndex: 9999, overflowY: 'auto',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideUp { from { transform: translateY(100vh); } to { transform: translateY(0); } }
            `}} />

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '24px', right: '16px',
                        background: 'none', border: 'none', color: 'var(--foreground-muted)',
                        cursor: 'pointer', padding: '8px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                        backgroundColor: 'var(--surface-secondary)', zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>

                <SessionLogEditor
                    sessionId={sessionId}
                    dateParam={dateParam}
                    timeParam={timeParam}
                    exercisesParam={exercisesParam}
                    nameParam={nameParam}
                    onComplete={onClose}
                    onDelete={onClose}
                />
            </div>
        </div>
    );
}
