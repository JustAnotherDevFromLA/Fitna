"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dbStore } from '../../lib/db';
import { Session, WeightliftingActivity } from '../../models/Session';
import { useSessionStore } from '../../lib/store';
import { useToast } from '../../lib/ToastContext';
import { Trash, Copy } from 'lucide-react';
import styles from './History.module.css';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const { deleteSession, startNewSession } = useSessionStore();
    const router = useRouter();
    const toast = useToast();

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
            router.push('/session/edit'); // Uses active Zustand state, no ?sessionId= required
        }, 50);
    };

    if (loading) return <div style={{ padding: '24px', color: 'white' }}>Loading history...</div>;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Workout History</h1>
            </header>

            {sessions.length === 0 ? (
                <div className={styles.emptyState}>No past sessions found. Get to work!</div>
            ) : (
                <div className={styles.timeline}>
                    {sessions.map(session => {
                        const date = new Date(session.startTime).toLocaleDateString([], {
                            weekday: 'short', month: 'short', day: 'numeric'
                        });
                        const durationMs = session.endTime ? session.endTime - session.startTime : 0;
                        const durationMins = Math.round(durationMs / 60000);

                        // Calculate total volume for weightlifting blocks
                        let totalVolume = 0;
                        session.activities.forEach(act => {
                            if (act.type === 'weightlifting') {
                                (act as WeightliftingActivity).sets.forEach(set => {
                                    totalVolume += (set.weight * set.reps);
                                });
                            }
                        });

                        return (
                            <Link href={`/session/edit?sessionId=${session.id}`} key={session.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className={styles.date}>{date}</span>
                                            <span className={styles.duration}>
                                                • {durationMins > 0 ? `${durationMins} min` : 'Ongoing'}
                                                {totalVolume > 0 && ` • Vol: ${totalVolume.toLocaleString()}lbs`}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className={styles.deleteButton}
                                                style={{ color: '#0070f3' }}
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
                                            <span style={{ color: '#666', fontSize: '0.9rem' }}>Empty Session</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
