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
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.3s ease-in'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />

            {/* Header Navbar - Styled like the 'Todays Plan' Card */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: '24px',
                gap: '8px'
            }}>
                <h3 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.5rem', fontWeight: 800 }}>
                    {activeSession.name}
                </h3>
                {activeSession.status === 'paused' ? (
                    <span style={{ fontSize: '0.85rem', color: '#f5a623', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', backgroundColor: 'rgba(245, 166, 35, 0.1)', borderRadius: '4px' }}>
                        SESSION PAUSED
                    </span>
                ) : (
                    <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600 }}>
                        Active Session
                    </span>
                )}
            </div>

            {/* Status Widgets */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Time</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(activeElapsed)}</span>
                </div>

                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Time</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foreground-muted)', fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(totalElapsed)}</span>
                </div>
            </div>

            {/* Floating Rest Timer Widget */}
            <div style={{
                backgroundColor: isTimerActive ? 'var(--primary-light)' : 'var(--surface)',
                border: isTimerActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                padding: '16px 20px',
                borderRadius: '16px',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={24} color={isTimerActive ? 'var(--primary)' : 'var(--foreground-muted)'} />
                    <div style={{ textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 700, color: isTimerActive ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
                            {isTimerActive ? formatTime(restSeconds) : 'Rest Timer'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {isTimerActive ? (
                        <Button variant="secondary" size="small" onClick={skipRest} style={{ color: 'var(--danger)', padding: '8px 16px' }}>Skip</Button>
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
            <div style={{ textAlign: 'left', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '24px', flexGrow: 1 }}>
                {activeSession.activities.length === 0 ? (
                    <p style={{ color: 'var(--foreground-muted)', textAlign: 'center', marginTop: '40px' }}>No activities in this session yet. Add one to begin.</p>
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

            {/* Inline Action Bar */}
            <div style={{ width: '100%', display: 'flex', gap: '16px', marginTop: 'auto', paddingTop: '16px' }}>
                <Button
                    variant="secondary"
                    style={{ flex: 1 }}
                    onClick={activeSession.status === 'paused' ? resumeSession : pauseSession}
                >
                    {activeSession.status === 'paused' ? 'Resume Workout' : 'Pause Workout'}
                </Button>
                <Button
                    variant="primary"
                    style={{ flex: 1 }}
                    onClick={async () => {
                        await endSession();
                    }}
                >
                    Complete Workout
                </Button>
            </div>
        </div>
    );
}

