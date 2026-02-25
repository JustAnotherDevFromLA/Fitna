"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dbStore } from '../../lib/db';
import { Session, WeightliftingActivity } from '../../models/Session';
import { useSessionStore } from '../../lib/store';
import { useToast } from '../../lib/ToastContext';
import { Trash, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './History.module.css';
import { useRouter } from 'next/navigation';
import { getDynamicSessionTitle } from '../../lib/utils';
import { SessionLogModal } from '../../components/session/SessionLogModal';

export default function HistoryPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const { deleteSession, startNewSession } = useSessionStore();
    const router = useRouter();
    const toast = useToast();
    const [sessionLogModal, setSessionLogModal] = useState<{
        isOpen: boolean;
        sessionId?: string | null;
        dateParam?: string | null;
    }>({ isOpen: false });

    useEffect(() => {
        async function loadHistory() {
            try {
                const data = await dbStore.getAllSessions();
                setSessions(data);
            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                setLoading(false);
            }
        }
        loadHistory();
    }, []);

    const handleDelete = (e: React.MouseEvent, sessionId: string) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation(); // Stop event bubbling

        toast.confirm("Are you sure you want to delete this session?", async () => {
            await deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success("Session deleted");
        });
    };

    const handleCopy = (e: React.MouseEvent, pastSession: Session) => {
        e.preventDefault();
        e.stopPropagation();

        // Start a fresh session with today's date
        startNewSession('user_123', 'Copied Workout');

        // Deep clone activities with fresh IDs asynchronously by updating Zustand
        // Wait briefly for Zustand to mount the new startNewSession state
        setTimeout(() => {
            const state = useSessionStore.getState();
            if (!state.activeSession) return;

            pastSession.activities.forEach(act => {
                const freshId = `act_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                if (act.type === 'weightlifting') {
                    const clonedAct: WeightliftingActivity = {
                        ...act,
                        id: freshId,
                        sets: (act as WeightliftingActivity).sets.map(s => ({ ...s, id: `set_${Date.now()}_${Math.random().toString(36).substring(7)}` }))
                    };
                    state.addActivityToSession(clonedAct);
                } else {
                    state.addActivityToSession({ ...act, id: freshId });
                }
            });

            toast.success("Workout Copied!");
            setSessionLogModal({ isOpen: true, sessionId: state.activeSession?.id });
        }, 50);
    };

    if (loading) return <div style={{ padding: '24px', color: 'var(--foreground)' }}>Loading history...</div>;

    const prevMonth = () => {
        setCurrentMonth(prev => {
            const date = new Date(prev);
            date.setMonth(date.getMonth() - 1);
            return date;
        });
    };

    const nextMonth = () => {
        setCurrentMonth(prev => {
            const date = new Date(prev);
            date.setMonth(date.getMonth() + 1);
            return date;
        });
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getIconForActivity = (type: string) => {
        switch (type) {
            case 'weightlifting': return '🏋️';
            case 'cardio': return '🏃';
            case 'mobility': return '🧘';
            default: return '⭐';
        }
    };

    const getDaySessions = (dayNumber: number) => {
        const startOfDay = new Date(year, month, dayNumber, 0, 0, 0, 0).getTime();
        const endOfDay = new Date(year, month, dayNumber, 23, 59, 59, 999).getTime();

        return sessions.filter(
            s => s.endTime && s.startTime >= startOfDay && s.startTime <= endOfDay
        );
    };

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>History</h1>
            </header>

            {/* Integrated Calendar Grid */}
            <section style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={prevMonth}
                        style={{ background: 'none', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, flex: 1, textAlign: 'center' }}>
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                        onClick={nextMonth}
                        style={{ background: 'none', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                        <div key={dayName} style={{ textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                            {dayName}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                    {blanks.map(blank => (
                        <div key={`blank-${blank}`} style={{ minHeight: '60px', backgroundColor: 'transparent' }} />
                    ))}

                    {days.map(day => {
                        const daySessions = getDaySessions(day);
                        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                        const activityIcons = Array.from(new Set(
                            daySessions.flatMap(s => s.activities.map(act => getIconForActivity(act.type)))
                        ));

                        const hasWorkout = daySessions.length > 0;

                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                        return (
                            <div
                                key={`day-${day}`}
                                onClick={() => setSessionLogModal({ isOpen: true, dateParam: dateStr })}
                                className={styles.calendarDay}
                                style={{
                                    backgroundColor: isToday ? 'var(--primary-light)' : (hasWorkout ? 'var(--surface-secondary)' : 'var(--background)'),
                                    border: isToday ? '1px solid var(--primary)' : (hasWorkout ? '1px solid var(--border-hover)' : '1px solid var(--border)'),
                                }}
                            >
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: isToday ? 800 : (hasWorkout ? 700 : 500),
                                    color: isToday ? 'var(--primary)' : (hasWorkout ? 'var(--foreground)' : 'var(--foreground-muted)'),
                                    marginBottom: '4px'
                                }}>
                                    {day}
                                </span>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: 'auto', justifyContent: 'center' }}>
                                    {activityIcons.map((icon, idx) => (
                                        <span key={idx} style={{ fontSize: '0.9rem', lineHeight: 1 }}>
                                            {icon}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {sessions.length === 0 ? (
                <div className={styles.emptyState}>No past sessions found. Get to work!</div>
            ) : (
                <div className={styles.timeline}>
                    {sessions
                        .sort((a, b) => {
                            // Active workouts float to the top
                            if (!a.endTime && b.endTime) return -1;
                            if (a.endTime && !b.endTime) return 1;
                            // Further sort strictly descending by start time
                            return b.startTime - a.startTime;
                        })
                        .map(session => {
                            const date = new Date(session.startTime).toLocaleDateString([], {
                                weekday: 'short', month: 'short', day: 'numeric'
                            });
                            const startTimeStr = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const endTimeStr = session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                            const isActive = !session.endTime;

                            let durationMins = 0;
                            if (session.endTime) {
                                durationMins = Math.round((session.endTime - session.startTime - (session.totalPausedMs || 0)) / 60000);
                            }

                            // Calculate total volume for weightlifting blocks
                            let totalVolume = 0;
                            session.activities.forEach(act => {
                                if (act.type === 'weightlifting') {
                                    (act as WeightliftingActivity).sets.forEach(set => {
                                        totalVolume += (set.weight * set.reps);
                                    });
                                }
                            });

                            const sessionTitle = getDynamicSessionTitle(session);

                            return (
                                <div
                                    key={session.id}
                                    onClick={() => setSessionLogModal({ isOpen: true, sessionId: session.id })}
                                    style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                                >
                                    <div className={styles.card} style={{ borderColor: isActive ? 'var(--primary)' : 'var(--border)', backgroundColor: isActive ? 'var(--primary-light)' : 'var(--surface)' }}>
                                        <div className={styles.cardHeader}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
                                                    {sessionTitle}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span className={styles.date}>{date}</span>
                                                    <span className={styles.duration} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                                        {startTimeStr} {endTimeStr ? `- ${endTimeStr}` : ''}
                                                    </span>
                                                    <span className={styles.duration}>
                                                        • {isActive ? (session.status === 'paused' ? 'Paused' : 'Active Workout') : (durationMins > 0 ? `${durationMins} min` : '0 min')}
                                                        {totalVolume > 0 && ` • Vol: ${totalVolume.toLocaleString()}lbs`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className={styles.deleteButton}
                                                    style={{ color: 'var(--primary)' }}
                                                    onClick={(e) => handleCopy(e, session)}
                                                    aria-label="Copy Session"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={(e) => handleDelete(e, session.id)}
                                                    aria-label="Delete Session"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.activityList}>
                                            {session.activities.map(act => (
                                                <div key={act.id} className={styles.activityRow}>
                                                    <span className={styles.activityName}>{act.name}</span>
                                                    {act.type === 'weightlifting' && (
                                                        <span className={styles.activityDetail}>
                                                            {(act as WeightliftingActivity).sets.length} sets
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {session.activities.length === 0 && (
                                                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Empty Session</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            <SessionLogModal
                isOpen={sessionLogModal.isOpen}
                onClose={() => {
                    setSessionLogModal({ isOpen: false });
                    // Refresh history after modal closes (in case of edits/deletes)
                    dbStore.getAllSessions().then(setSessions);
                }}
                sessionId={sessionLogModal.sessionId}
                dateParam={sessionLogModal.dateParam}
            />
        </main>
    );
}
