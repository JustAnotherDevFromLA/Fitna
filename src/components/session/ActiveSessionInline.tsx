"use client";

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Button } from './../ui/Button';
import { ActivityBlock } from './ActivityBlock';
import { useSessionStore } from '../../lib/store';

export function ActiveSessionInline() {
    const {
        activeSession,
        endSession,
        pauseSession,
        resumeSession,
        removeActivity,
        updateActivity
    } = useSessionStore();

    const [activeElapsed, setActiveElapsed] = useState<number>(0);
    const [totalElapsed, setTotalElapsed] = useState<number>(0);
    const [restSeconds, setRestSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);

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

            setActiveElapsed(getActiveDuration());
            setTotalElapsed(Date.now() - activeSession.startTime);

            interval = setInterval(() => {
                setActiveElapsed(getActiveDuration());
                setTotalElapsed(Date.now() - activeSession.startTime);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    // Rest Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isTimerActive && restSeconds > 0) {
            interval = setInterval(() => {
                setRestSeconds((prev) => prev - 1);
            }, 1000);
        } else if (restSeconds === 0 && isTimerActive) {
            setIsTimerActive(false);
            if (activeSession?.status === 'paused') {
                resumeSession();
            }
        }
        return () => clearInterval(interval);
    }, [isTimerActive, restSeconds, activeSession, resumeSession]);

    const startRest = (seconds: number) => {
        setRestSeconds(seconds);
        setIsTimerActive(true);
        if (activeSession?.status !== 'paused') {
            pauseSession();
        }
    };

    const skipRest = () => {
        setRestSeconds(0);
        setIsTimerActive(false);
        if (activeSession?.status === 'paused') {
            resumeSession();
        }
    };

    const formatElapsed = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        if (totalSeconds < 0) return "0:00";
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        if (m > 59) {
            const h = Math.floor(m / 60);
            const rm = m % 60;
            return `${h}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!activeSession) return null;

    return (
        <div style={{ width: '100%', paddingBottom: '100px', animation: 'fadeIn 0.3s ease-in' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />

            {/* Header Navbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{activeSession.name}</h2>
                    <span style={{ fontSize: '0.9rem', color: '#0070f3', fontWeight: 600 }}>Active Session</span>
                </div>
            </div>

            {/* Status Widgets */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161616', padding: '16px 24px', borderRadius: '16px', border: '1px solid #333', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Time</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0070f3', fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(activeElapsed)}</span>
                </div>

                <div style={{ width: '1px', height: '40px', backgroundColor: '#333' }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Time</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#888', fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(totalElapsed)}</span>
                </div>
            </div>

            {/* Floating Rest Timer Widget */}
            <div style={{
                backgroundColor: isTimerActive ? 'rgba(0, 112, 243, 0.1)' : '#161616',
                border: isTimerActive ? '1px solid #0070f3' : '1px solid #333',
                padding: '16px 20px',
                borderRadius: '16px',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={24} color={isTimerActive ? '#0070f3' : '#888'} />
                    <div style={{ textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 700, color: isTimerActive ? '#fff' : '#ccc' }}>
                            {isTimerActive ? formatTime(restSeconds) : 'Rest Timer'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {isTimerActive ? (
                        <Button variant="secondary" size="small" onClick={skipRest} style={{ color: '#ff4d4f', padding: '8px 16px' }}>Skip</Button>
                    ) : (
                        <>
                            <Button variant="secondary" size="small" onClick={() => startRest(60)}>1:00</Button>
                            <Button variant="secondary" size="small" onClick={() => startRest(90)}>1:30</Button>
                            <Button variant="secondary" size="small" onClick={() => startRest(120)}>2:00</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Programmed Blocks */}
            <div style={{ textAlign: 'left', marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {activeSession.activities.length === 0 ? (
                    <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>No activities in this session yet. Add one to begin.</p>
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
            </div>

            {/* Fixed Bottom Action Bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, width: '100vw',
                backgroundColor: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(10px)',
                borderTop: '1px solid #222', padding: '20px 24px',
                display: 'flex', justifyContent: 'center', zIndex: 10000
            }}>
                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', gap: '16px' }}>
                    <Button
                        variant="secondary"
                        style={{ flex: 1 }}
                        onClick={activeSession.status === 'paused' ? resumeSession : pauseSession}
                    >
                        {activeSession.status === 'paused' ? 'Resume Workout' : 'Pause Workout'}
                    </Button>
                    <Button
                        variant="primary"
                        style={{ flex: 1, backgroundColor: '#00c853', color: '#000' }}
                        onClick={async () => {
                            await endSession();
                        }}
                    >
                        Complete Workout
                    </Button>
                </div>
            </div>
        </div>
    );
}

