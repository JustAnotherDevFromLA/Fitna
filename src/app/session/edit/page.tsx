"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSessionStore } from '../../../lib/store';
import { dbStore } from '../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { ActivityBlock } from '../../../components/session/ActivityBlock';
import { Plus, Save, Clock, Trash } from 'lucide-react';
import { WeightliftingActivity, CardioActivity, MobilityActivity } from '../../../models/Session';
import { useToast } from '../../../lib/ToastContext';

function SessionEditForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const toast = useToast();

    const {
        activeSession,
        startNewSession,
        restoreSession,
        endSession,
        addActivityToSession,
        removeActivity,
        updateActivity,
        deleteSession,
        updateSessionStartTime
    } = useSessionStore();

    const [isLoading, setIsLoading] = useState(true);
    const isInitializing = React.useRef(false);

    useEffect(() => {
        async function init() {
            if (isInitializing.current) return;
            isInitializing.current = true;

            if (sessionId) {
                // Load past session for editing
                const pastSession = await dbStore.getSession(sessionId);
                if (pastSession) {
                    restoreSession(pastSession);
                }
            } else if (!activeSession) {
                // Create brand new high-level session template
                // Support passing ?date=YYYY-MM-DD to backdate historical sessions
                const dateParam = searchParams.get('date');
                let startTimeOverride = undefined;

                if (dateParam) {
                    const parsed = new Date(dateParam);
                    if (!isNaN(parsed.getTime())) {
                        startTimeOverride = parsed.getTime();
                    }
                }

                startNewSession('user_123', 'Custom Workout', startTimeOverride);
            }
            setIsLoading(false);
        }
        init();
    }, [sessionId, activeSession, startNewSession, restoreSession, searchParams]);

    if (isLoading || !activeSession) return <div style={{ color: 'white', padding: '24px' }}>Loading Builder...</div>;
    const handleCreateBlock = (type: 'weightlifting' | 'cardio' | 'mobility') => {
        const baseId = `act_${Date.now()}`;

        if (type === 'weightlifting') {
            const w: WeightliftingActivity = {
                id: baseId,
                type: 'weightlifting',
                name: 'New Lift',
                sets: [{ id: `set_${Date.now()}`, weight: 135, reps: 5 }]
            };
            addActivityToSession(w);
        } else if (type === 'cardio') {
            const c: CardioActivity = {
                id: baseId,
                type: 'cardio',
                name: 'Zone 2 Run',
                duration: 1800, // 30 mins
                distance: 3
            };
            addActivityToSession(c);
        } else {
            const m: MobilityActivity = {
                id: baseId,
                type: 'mobility',
                name: 'Yoga Flow',
                duration: 900
            };
            addActivityToSession(m);
        }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeVal = e.target.value; // Format: "14:30"
        if (!timeVal) return;

        const [hours, minutes] = timeVal.split(':').map(Number);
        const originalDate = new Date(activeSession.startTime);

        originalDate.setHours(hours);
        originalDate.setMinutes(minutes);
        originalDate.setSeconds(0);
        originalDate.setMilliseconds(0);

        updateSessionStartTime(originalDate.getTime());
    };

    const isPastSession = activeSession.endTime !== undefined;

    // Helper to format Date -> "HH:MM" for the input
    const d = new Date(activeSession.startTime);
    const formattedTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    return (
        <main style={{ padding: '24px', color: 'white', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Session Builder</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', marginTop: '6px' }}>
                        <span>{new Date(activeSession.startTime).toLocaleDateString()}</span>
                        <span>•</span>
                        <input
                            type="time"
                            value={formattedTime}
                            onChange={handleTimeChange}
                            style={{
                                backgroundColor: 'transparent',
                                color: '#888',
                                border: 'none',
                                fontSize: '1rem',
                                fontFamily: 'inherit',
                                outline: 'none',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        />
                    </div>
                </div>

                {isPastSession ? (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '8px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700 }}>
                        Historical
                    </div>
                ) : (
                    <div style={{ backgroundColor: 'rgba(0, 112, 243, 0.2)', color: '#0070f3', padding: '8px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={16} /> Active
                    </div>
                )}
            </header>

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '8px', marginBottom: '16px', color: '#ccc' }}>
                    Programmed Blocks
                </h3>

                {activeSession.activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#666', border: '1px dashed #333', borderRadius: '16px' }}>
                        No activities added yet.<br />Start building below!
                    </div>
                ) : (
                    activeSession.activities.map(act => (
                        <ActivityBlock
                            key={act.id}
                            activity={act}
                            onRemove={removeActivity}
                            onUpdate={updateActivity}
                        />
                    ))
                )}
            </section>

            <section style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Add Activity</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <Button variant="secondary" size="normal" onClick={() => handleCreateBlock('weightlifting')}>
                        🏋️ Lift
                    </Button>
                    <Button variant="secondary" size="normal" onClick={() => handleCreateBlock('cardio')}>
                        🏃 Cardio
                    </Button>
                    <Button variant="secondary" size="normal" onClick={() => handleCreateBlock('mobility')}>
                        🧘 Mob
                    </Button>
                </div>
            </section>

            <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
                {isPastSession && (
                    <Button
                        variant="ghost"
                        size="large"
                        onClick={() => {
                            toast.confirm("Are you sure you want to delete this entire session? This cannot be undone.", async () => {
                                await deleteSession(activeSession.id);
                                toast.success("Session deleted successfully.");
                                router.push('/history');
                            });
                        }}
                        style={{ color: '#ff4d4f' }}
                    >
                        <Trash size={20} />
                    </Button>
                )}
                <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={async () => {
                        if (!isPastSession) await endSession();
                        router.push('/history');
                    }}
                >
                    <Save size={20} style={{ marginRight: '8px' }} />
                    {isPastSession ? 'Update Session' : 'Save & Complete'}
                </Button>
            </div>
        </main>
    );
}

export default function SessionEditPage() {
    return (
        <Suspense fallback={<div style={{ color: 'white', padding: '24px' }}>Loading Editor...</div>}>
            <SessionEditForm />
        </Suspense>
    );
}
