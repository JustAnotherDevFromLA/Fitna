import React, { useState } from 'react';
import { useSessionStore } from '@/lib/store';

export const OnboardingModal: React.FC = () => {
    const { onboardUser } = useSessionStore();
    const [bodyweight, setBodyweight] = useState('');
    const [squat, setSquat] = useState('');
    const [bench, setBench] = useState('');
    const [deadlift, setDeadlift] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        await onboardUser({
            bodyweight: parseFloat(bodyweight) || undefined,
            squat_1rm: parseFloat(squat) || undefined,
            bench_1rm: parseFloat(bench) || undefined,
            deadlift_1rm: parseFloat(deadlift) || undefined,
        });

        setIsSubmitting(false);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--overlay)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            padding: '24px'
        }}>
            <div style={{
                backgroundColor: 'var(--background)',
                borderRadius: '24px',
                border: '1px solid var(--border)',
                padding: '32px 24px',
                width: '100%',
                maxWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                boxShadow: 'var(--shadow-modal)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--foreground)' }}>
                        Welcome to Fitna
                    </h2>
                    <p style={{ fontSize: '0.95rem', color: 'var(--foreground-muted)', margin: 0, lineHeight: 1.5 }}>
                        Let&apos;s establish your baseline metrics so the Goal Engine can build your perfect progression.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Bodyweight (lbs)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={bodyweight}
                            onChange={(e) => setBodyweight(e.target.value)}
                            placeholder="e.g. 185"
                            style={{
                                backgroundColor: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                color: 'var(--foreground)',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>
                                Squat
                            </label>
                            <input
                                type="number"
                                value={squat}
                                onChange={(e) => setSquat(e.target.value)}
                                placeholder="1RM"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '12px 8px',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>
                                Bench
                            </label>
                            <input
                                type="number"
                                value={bench}
                                onChange={(e) => setBench(e.target.value)}
                                placeholder="1RM"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '12px 8px',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>
                                Deadlift
                            </label>
                            <input
                                type="number"
                                value={deadlift}
                                onChange={(e) => setDeadlift(e.target.value)}
                                placeholder="1RM"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '12px 8px',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            marginTop: '16px',
                            backgroundColor: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '16px',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1,
                            transition: 'background-color 0.2s',
                        }}
                    >
                        {isSubmitting ? 'Saving...' : 'Enter the Architect'}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#666', margin: 0 }}>
                        You can always update these later in your Profile.
                    </p>
                </form>
            </div>
        </div>
    );
};
