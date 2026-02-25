"use client";

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../../lib/store';
import { dbStore } from '../../lib/db';
import { Button } from '../ui/Button';
import { ActivityBlock } from './ActivityBlock';
import { Save, Clock, Trash, Play, Pause, Calendar } from 'lucide-react';
import { WeightliftingActivity, CardioActivity, MobilityActivity, Activity } from '../../models/Session';
import { useToast } from '../../lib/ToastContext';
import { GoalEngine, SplitType, SessionPlan } from '../../lib/GoalEngine';

interface SessionLogEditorProps {
    sessionId?: string | null;
    dateParam?: string | null;
    timeParam?: string | null;
    exercisesParam?: string | null;
    nameParam?: string | null;
    onComplete?: () => void;
    onDelete?: () => void;
}

export function SessionLogEditor({
    sessionId,
    dateParam,
    timeParam,
    exercisesParam,
    nameParam,
    onComplete,
    onDelete
}: SessionLogEditorProps) {
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
        updateSessionStartTime,
        updateSessionEndTime,
        pauseSession,
        resumeSession
    } = useSessionStore();

    const [isLoading, setIsLoading] = useState(true);
    const isInitializing = React.useRef(false);
    const [restSeconds, setRestSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [activeElapsed, setActiveElapsed] = useState<number>(0);
    const [totalElapsed, setTotalElapsed] = useState<number>(0);

    // Live Workout Timer Tracker
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (activeSession && !activeSession.endTime) {
            const getActiveDuration = () => {
                if (activeSession.status === 'paused' && activeSession.pausedAt) {
                    return activeSession.pausedAt - activeSession.startTime - (activeSession.totalPausedMs || 0);
                }
                return Date.now() - activeSession.startTime - (activeSession.totalPausedMs || 0);
            };

            const getTotalDuration = () => {
                return Date.now() - activeSession.startTime;
            };

            setTimeout(() => {
                setActiveElapsed(getActiveDuration());
                setTotalElapsed(getTotalDuration());
            }, 0);

            interval = setInterval(() => {
                setTotalElapsed(getTotalDuration());
                if (activeSession.status !== 'paused') {
                    setActiveElapsed(getActiveDuration());
                }
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeSession]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerActive && restSeconds > 0) {
            interval = setInterval(() => {
                setRestSeconds((prev) => prev - 1);
            }, 1000);
        } else if (restSeconds === 0 && isTimerActive) {
            setTimeout(() => {
                setIsTimerActive(false);
                resumeSession();
            }, 0);
            toast.success("Rest complete! Let's go!");
        }
        return () => clearInterval(interval);
    }, [isTimerActive, restSeconds, toast, resumeSession]);

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
            } else if (!activeSession || (dateParam && new Date(activeSession.startTime).toLocaleDateString() !== new Date(dateParam).toLocaleDateString())) {
                // Create brand new high-level session template OR handle date change for new session
                let startTimeOverride = undefined;
                let parsedSessionName = 'Workout';

                if (nameParam) {
                    parsedSessionName = decodeURIComponent(nameParam);
                }

                if (dateParam) {
                    const dateString = timeParam ? `${dateParam}T${timeParam}:00` : `${dateParam}T00:00:00`;
                    const parsed = new Date(dateString);
                    if (!isNaN(parsed.getTime())) {
                        startTimeOverride = parsed.getTime();
                    }
                }

                // Phase 28: Universal Pre-population via URL mapping first, then fallback
                let initialActivities: Activity[] | undefined = undefined;

                if (exercisesParam) {
                    try {
                        const parsedExercises: string[] = JSON.parse(decodeURIComponent(exercisesParam));
                        if (parsedExercises.length > 0) {
                            initialActivities = parsedExercises.map((exerciseName, index) => {
                                const randomSuffix = Math.random().toString(36).substring(7);
                                return {
                                    id: `act_${Date.now()}_${index}_${randomSuffix}`,
                                    type: 'weightlifting',
                                    name: exerciseName,
                                    sets: [{ id: `set_${Date.now()}_${index}_0_${randomSuffix}`, weight: 0, reps: 0 }]
                                } as WeightliftingActivity;
                            });
                        }
                    } catch (e) {
                        console.error("Failed to parse exercises param", e);
                    }
                } else {
                    const storedSplit = localStorage.getItem('activeSplit') as SplitType | null;

                    if (storedSplit) {
                        const dateToUse = startTimeOverride ? new Date(startTimeOverride) : new Date();
                        const getGoalEngineDay = (d: Date) => d.getDay() + 1;
                        const targetDay = getGoalEngineDay(dateToUse);

                        const routines = GoalEngine.generateSessionsForSplit(storedSplit);
                        const todaysPlan: SessionPlan | null = routines.find(r => r.day === targetDay) || null;

                        if (todaysPlan && todaysPlan.exercises.length > 0 && !todaysPlan.focus.toLowerCase().includes('rest')) {
                            initialActivities = todaysPlan.exercises.map((exerciseName, index) => {
                                const randomSuffix = Math.random().toString(36).substring(7);
                                return {
                                    id: `act_${Date.now()}_${index}_${randomSuffix}`,
                                    type: 'weightlifting',
                                    name: exerciseName,
                                    sets: [{ id: `set_${Date.now()}_${index}_0_${randomSuffix}`, weight: 0, reps: 0 }]
                                } as WeightliftingActivity;
                            });
                        }
                    }
                }

                await startNewSession('user_123', 'Custom Workout', startTimeOverride, initialActivities, parsedSessionName);
            }
            setIsLoading(false);
        }
        init();
    }, [sessionId, activeSession, startNewSession, restoreSession, dateParam, timeParam, exercisesParam, nameParam]);

    if (isLoading || !activeSession) return <div style={{ color: 'var(--foreground)', padding: '24px' }}>Loading Builder...</div>;

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
        const timeVal = e.target.value;
        if (!timeVal) return;

        const [hours, minutes] = timeVal.split(':').map(Number);
        const originalDate = new Date(activeSession.startTime);
        originalDate.setHours(hours);
        originalDate.setMinutes(minutes);
        originalDate.setSeconds(0);
        originalDate.setMilliseconds(0);
        updateSessionStartTime(originalDate.getTime());
    };

    const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeVal = e.target.value;
        if (!timeVal) return;

        const [hours, minutes] = timeVal.split(':').map(Number);
        const originalDate = activeSession.endTime ? new Date(activeSession.endTime) : new Date(activeSession.startTime);
        originalDate.setHours(hours);
        originalDate.setMinutes(minutes);
        originalDate.setSeconds(0);
        originalDate.setMilliseconds(0);
        updateSessionEndTime(originalDate.getTime());
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateVal = e.target.value;
        if (!dateVal) return;

        const [year, month, day] = dateVal.split('-').map(Number);
        const originalDate = new Date(activeSession.startTime);
        originalDate.setFullYear(year);
        originalDate.setMonth(month - 1);
        originalDate.setDate(day);
        updateSessionStartTime(originalDate.getTime());
    };

    const isPastSession = activeSession.endTime !== undefined;

    const d = new Date(activeSession.startTime);
    const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const formattedTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const formattedEndTime = activeSession.endTime ? (() => {
        const dEnd = new Date(activeSession.endTime);
        return `${dEnd.getHours().toString().padStart(2, '0')}:${dEnd.getMinutes().toString().padStart(2, '0')}`;
    })() : '';

    const startRest = (seconds: number) => {
        pauseSession();
        setRestSeconds(seconds);
        setIsTimerActive(true);
    };

    const skipRest = () => {
        setRestSeconds(0);
        setIsTimerActive(false);
        resumeSession();
    };

    const handleManualPauseResume = () => {
        setRestSeconds(0);
        setIsTimerActive(false);
        if (activeSession?.status === 'paused') {
            resumeSession();
        } else {
            pauseSession();
        }
    };

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ color: 'var(--foreground)', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingRight: '48px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Session Log</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--surface-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'text' }}>
                            <Calendar size={16} color="var(--foreground-muted)" />
                            <input
                                type="date"
                                value={formattedDate}
                                onChange={handleDateChange}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--foreground)',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--surface-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'text' }}>
                            <input
                                type="time"
                                className="input-no-icon"
                                value={formattedTime}
                                onChange={handleTimeChange}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--foreground)',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            />
                            {isPastSession && (
                                <>
                                    <span style={{ color: 'var(--foreground-muted)', margin: '0 4px', fontSize: '0.9rem', fontWeight: 600 }}>-</span>
                                    <input
                                        type="time"
                                        className="input-no-icon"
                                        value={formattedEndTime}
                                        onChange={handleEndTimeChange}
                                        style={{
                                            backgroundColor: 'transparent',
                                            color: 'var(--foreground)',
                                            border: 'none',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {isPastSession ? (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '8px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700 }}>
                        Historical
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Active</span>
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.9rem' }}>{formatTime(Math.floor(activeElapsed / 1000))}</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--foreground-muted)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Total</span>
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.9rem' }}>{formatTime(Math.floor(totalElapsed / 1000))}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleManualPauseResume}
                            style={{
                                backgroundColor: activeSession.status === 'paused' ? 'rgba(245, 166, 35, 0.1)' : 'var(--surface-secondary)',
                                color: activeSession.status === 'paused' ? '#f5a623' : 'var(--foreground)',
                                padding: '4px 12px',
                                borderRadius: '24px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            {activeSession.status === 'paused' ? <><Play size={12} fill="currentColor" /> Resume</> : <><Pause size={12} fill="currentColor" /> Pause</>}
                        </button>
                    </div>
                )}
            </header>

            {/* Floating Rest Timer Widget */}
            {!isPastSession && (
                <div style={{
                    backgroundColor: isTimerActive ? 'var(--primary-light)' : 'var(--surface-secondary)',
                    border: isTimerActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={24} color={isTimerActive ? 'var(--primary)' : 'var(--foreground-muted)'} />
                        <div>
                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 700, color: isTimerActive ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
                                {isTimerActive ? formatTime(restSeconds) : 'Rest Timer'}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
                                {isTimerActive ? 'Resting...' : 'Tap to start'}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {isTimerActive ? (
                            <Button variant="secondary" size="small" onClick={skipRest} style={{ color: '#ff4d4f' }}>Skip</Button>
                        ) : (
                            <>
                                <Button variant="secondary" size="small" onClick={() => startRest(60)}>1:00</Button>
                                <Button variant="secondary" size="small" onClick={() => startRest(90)}>1:30</Button>
                                <Button variant="secondary" size="small" onClick={() => startRest(120)}>2:00</Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px', color: 'var(--foreground-muted)' }}>
                    Exercise Schedule
                </h3>

                {activeSession.activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--foreground-muted)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
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

            <section style={{ backgroundColor: 'var(--surface-secondary)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, color: 'var(--foreground-muted)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Add Activity</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <Button variant="secondary" size="normal" onClick={() => handleCreateBlock('weightlifting')}>
                        🏋️ Weightlifting
                    </Button>
                    <Button variant="secondary" size="normal" onClick={() => handleCreateBlock('cardio')}>
                        🏃 Cardio
                    </Button>
                    <Button variant="secondary" size="normal" onClick={() => handleCreateBlock('mobility')}>
                        🧘 Class
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
                                if (onDelete) onDelete();
                            });
                        }}
                        style={{ color: 'var(--danger)' }}
                    >
                        <Trash size={20} />
                    </Button>
                )}
                {isPastSession ? (
                    <Button
                        variant="primary"
                        size="large"
                        fullWidth
                        onClick={async () => {
                            await endSession();
                            if (onComplete) onComplete();
                        }}
                    >
                        <Save size={20} style={{ marginRight: '8px' }} />
                        Update Session
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="large"
                        fullWidth
                        style={{ color: 'var(--danger)' }}
                        onClick={async () => {
                            await endSession();
                            if (onComplete) onComplete();
                        }}
                    >
                        End Workout
                    </Button>
                )}
            </div>
        </div>
    );
}
