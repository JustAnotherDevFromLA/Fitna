/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../lib/ToastContext';
import { dbStore } from '../../lib/db';
import { DownloadCloud, LogOut, CheckCircle2 } from 'lucide-react';
import { WeightliftingActivity } from '../../models/Session';
import { useSessionStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

export default function ProfilePage() {
    const [squat1RM, setSquat1RM] = useState<string>('');
    const [bench1RM, setBench1RM] = useState<string>('');
    const [deadlift1RM, setDeadlift1RM] = useState<string>('');
    const [bodyweight, setBodyweight] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);
    const toast = useToast();
    const { user, userProfile, isAuthenticated, onboardUser } = useSessionStore();

    useEffect(() => {
        if (isAuthenticated && userProfile) {
            if (userProfile.squat_1rm) setSquat1RM(userProfile.squat_1rm.toString());
            if (userProfile.bench_1rm) setBench1RM(userProfile.bench_1rm.toString());
            if (userProfile.deadlift_1rm) setDeadlift1RM(userProfile.deadlift_1rm.toString());
            if (userProfile.bodyweight) setBodyweight(userProfile.bodyweight.toString());
        } else {
            // Load local fallbacks
            const sq = localStorage.getItem('1RM_Squat');
            const bn = localStorage.getItem('1RM_Bench');
            const dl = localStorage.getItem('1RM_Deadlift');
            const bw = localStorage.getItem('Bodyweight');
            if (sq) setSquat1RM(sq);
            if (bn) setBench1RM(bn);
            if (dl) setDeadlift1RM(dl);
            if (bw) setBodyweight(bw);
        }
    }, [isAuthenticated, userProfile]);

    const handleSave = async () => {
        if (isAuthenticated) {
            await onboardUser({
                squat_1rm: parseFloat(squat1RM) || undefined,
                bench_1rm: parseFloat(bench1RM) || undefined,
                deadlift_1rm: parseFloat(deadlift1RM) || undefined,
                bodyweight: parseFloat(bodyweight) || undefined
            });
            toast.success('Targets Synced to Cloud Profile!');
        } else {
            localStorage.setItem('1RM_Squat', squat1RM);
            localStorage.setItem('1RM_Bench', bench1RM);
            localStorage.setItem('1RM_Deadlift', deadlift1RM);
            localStorage.setItem('Bodyweight', bodyweight);
            toast.success('Targets Saved Locally');
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const sessions = await dbStore.getAllSessions();
            if (sessions.length === 0) {
                toast.error("No sessions found to export.");
                setIsExporting(false);
                return;
            }

            // CSV Header
            let csvContent = "Date,Duration (mins),Total Volume (lbs),Activities\n";

            sessions.forEach(session => {
                const date = new Date(session.startTime).toLocaleDateString();
                const durationMs = session.endTime ? session.endTime - session.startTime : 0;
                const durationMins = Math.round(durationMs / 60000);

                let vol = 0;
                const activityNames: string[] = [];

                session.activities.forEach(act => {
                    activityNames.push(act.name);
                    if (act.type === 'weightlifting') {
                        (act as WeightliftingActivity).sets.forEach(set => {
                            vol += (set.weight * set.reps);
                        });
                    }
                });

                // Wrap activities in quotes to avoid breaking CSV columns
                const joinedActivities = `"${activityNames.join('; ')}"`;
                csvContent += `${date},${durationMins},${vol},${joinedActivities}\n`;
            });

            // Trigger hidden download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `fitna_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Export successful!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to export data.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleLogin = async () => {
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/profile`
                }
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to initiate Google Login");
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            await dbStore.clearAllLocalData();

            // Wipe internal React component state
            setSquat1RM('');
            setBench1RM('');
            setDeadlift1RM('');
            setBodyweight('');

            toast.success("Signed out successfully");

            // Hard reload the window to ensure absolutely no stale state remains in Zustand or React Router
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error("Failed to sign out cleanly.");
        }
    };

    return (
        <main style={{ padding: '24px', color: 'white', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Profile</h1>
                <p style={{ color: '#888', marginTop: '4px' }}>Manage your account, data, and targets.</p>
            </header>

            {/* Authentication Card */}
            <div style={{
                backgroundColor: isAuthenticated ? 'rgba(0,112,243,0.05)' : '#1a1a1a',
                padding: '24px',
                borderRadius: '16px',
                border: isAuthenticated ? '1px solid #0070f3' : '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                {isAuthenticated && user ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="Profile"
                                    style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #0070f3' }}
                                />
                            ) : (
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#0070f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>{user.user_metadata?.full_name || 'Athlete'}</h3>
                                <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '0.9rem' }}>{user.email}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                    <CheckCircle2 size={14} color="#0070f3" />
                                    <span style={{ fontSize: '0.8rem', color: '#0070f3', fontWeight: 600 }}>Cloud Sync Active</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ background: 'none', border: '1px solid #ff4d4f', color: '#ff4d4f', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                ) : (
                    <>
                        <div>
                            <h3 style={{ margin: 0, color: '#fff' }}>Cloud Synchronization</h3>
                            <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '0.9rem' }}>
                                Sign in with Google to automatically backup your workouts to the cloud and sync across devices.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            size="large"
                            fullWidth
                            onClick={handleLogin}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#fff', color: '#000' }}
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', height: '18px' }} />
                            Sign in with Google
                        </Button>
                    </>
                )}
            </div>

            <div style={{
                backgroundColor: '#1a1a1a',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: 0, color: '#fff' }}>1 Rep Max (1RM) Targets</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                    Input your current 1RM in lbs. The Goal Engine will use these to calculate exact weight assignments for your progressive overload blocks.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) 2fr', gap: '16px', alignItems: 'center', marginTop: '12px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bodyweight</label>
                    <input
                        type="number"
                        value={bodyweight}
                        onChange={(e) => setBodyweight(e.target.value)}
                        placeholder="e.g. 185"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                        onBlur={(e) => e.target.style.borderColor = '#333'}
                    />

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Squat</label>
                    <input
                        type="number"
                        value={squat1RM}
                        onChange={(e) => setSquat1RM(e.target.value)}
                        placeholder="1RM (lbs)"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                        onBlur={(e) => e.target.style.borderColor = '#333'}
                    />

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bench</label>
                    <input
                        type="number"
                        value={bench1RM}
                        onChange={(e) => setBench1RM(e.target.value)}
                        placeholder="1RM (lbs)"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                        onBlur={(e) => e.target.style.borderColor = '#333'}
                    />

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadlift</label>
                    <input
                        type="number"
                        value={deadlift1RM}
                        onChange={(e) => setDeadlift1RM(e.target.value)}
                        placeholder="1RM (lbs)"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                        onBlur={(e) => e.target.style.borderColor = '#333'}
                    />
                </div>

                <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleSave}
                    style={{ marginTop: '16px' }}
                >
                    Save Targets
                </Button>
            </div>

            <div style={{
                backgroundColor: '#1a1a1a',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Data Management</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                    Fitna stores your data locally on this device. You can export your entire workout history as a CSV file at any time.
                </p>
                <Button
                    variant="secondary"
                    size="large"
                    fullWidth
                    onClick={handleExport}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                >
                    <DownloadCloud size={20} />
                    {isExporting ? 'Exporting...' : 'Export History to CSV'}
                </Button>
            </div>
        </main>
    );
}
