/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../lib/ToastContext';
import { dbStore } from '../../lib/db';
import { DownloadCloud, LogOut, CheckCircle2, Save } from 'lucide-react';
import { WeightliftingActivity } from '../../models/Session';
import { useSessionStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export default function ProfilePage() {
    const [squat1RM, setSquat1RM] = useState<string>('');
    const [bench1RM, setBench1RM] = useState<string>('');
    const [deadlift1RM, setDeadlift1RM] = useState<string>('');
    const [bodyweight, setBodyweight] = useState<string>('');
    const [gender, setGender] = useState<string>('');
    const [height, setHeight] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);
    const toast = useToast();
    const { user, userProfile, isAuthenticated, onboardUser } = useSessionStore();

    useEffect(() => {
        if (isAuthenticated && userProfile) {
            if (userProfile.squat_1rm) setSquat1RM(userProfile.squat_1rm.toString());
            if (userProfile.bench_1rm) setBench1RM(userProfile.bench_1rm.toString());
            if (userProfile.deadlift_1rm) setDeadlift1RM(userProfile.deadlift_1rm.toString());
            if (userProfile.bodyweight) setBodyweight(userProfile.bodyweight.toString());
            if (userProfile.gender) setGender(userProfile.gender);
            if (userProfile.height) setHeight(userProfile.height.toString());
        } else {
            // Load local fallbacks
            const sq = localStorage.getItem('1RM_Squat');
            const bn = localStorage.getItem('1RM_Bench');
            const dl = localStorage.getItem('1RM_Deadlift');
            const bw = localStorage.getItem('Bodyweight');
            const gen = localStorage.getItem('Gender');
            const hgt = localStorage.getItem('Height');
            if (sq && sq !== 'undefined' && sq !== 'null') setSquat1RM(sq);
            if (bn && bn !== 'undefined' && bn !== 'null') setBench1RM(bn);
            if (dl && dl !== 'undefined' && dl !== 'null') setDeadlift1RM(dl);
            if (bw && bw !== 'undefined' && bw !== 'null') setBodyweight(bw);
            if (gen && gen !== 'undefined' && gen !== 'null') setGender(gen);
            if (hgt && hgt !== 'undefined' && hgt !== 'null') setHeight(hgt);
        }
    }, [isAuthenticated, userProfile]);

    const handleSave = async () => {
        if (isAuthenticated) {
            try {
                await onboardUser({
                    squat_1rm: parseFloat(squat1RM) || undefined,
                    bench_1rm: parseFloat(bench1RM) || undefined,
                    deadlift_1rm: parseFloat(deadlift1RM) || undefined,
                    bodyweight: parseFloat(bodyweight) || undefined,
                    gender: gender || undefined,
                    height: parseFloat(height) || undefined
                });
                toast.success('Profile Synced to Cloud!');
            } catch (err: any) {
                console.error("Profile sync error caught in UI:", err);
                toast.error(`Sync Failed: ${err.message || JSON.stringify(err)}`);
            }
        } else {
            localStorage.setItem('1RM_Squat', squat1RM);
            localStorage.setItem('1RM_Bench', bench1RM);
            localStorage.setItem('1RM_Deadlift', deadlift1RM);
            localStorage.setItem('Bodyweight', bodyweight);
            localStorage.setItem('Gender', gender);
            localStorage.setItem('Height', height);
            toast.success('Profile Saved Locally');
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
            // Include the basePath (e.g., /Fitna) if present in the current URL 
            // window.location.pathname will be something like "/Fitna/profile" or "/profile"
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}${window.location.pathname}`
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
            setGender('');
            setHeight('');

            toast.success("Signed out successfully");

            // Hard reload the window to ensure absolutely no stale state remains in Zustand or React Router
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error("Failed to sign out cleanly.");
        }
    };

    return (
        <main style={{ padding: '24px', color: 'var(--foreground)', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Authentication Card */}
            <div style={{
                backgroundColor: isAuthenticated ? 'var(--primary-light)' : 'var(--surface-secondary)',
                padding: '24px',
                borderRadius: '16px',
                border: isAuthenticated ? '1px solid var(--primary)' : '1px solid var(--border)',
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
                                    style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--primary)' }}
                                />
                            ) : (
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.2rem' }}>{user.user_metadata?.full_name || 'Athlete'}</h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>{user.email}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                    <CheckCircle2 size={14} color="var(--primary)" />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Cloud Sync Active</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                ) : (
                    <>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Cloud Synchronization</h3>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
                                Sign in with Google to automatically backup your workouts to the cloud and sync across devices.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            size="large"
                            fullWidth
                            onClick={handleLogin}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', height: '18px' }} />
                            Sign in with Google
                        </Button>
                    </>
                )}
            </div>

            <div style={{
                backgroundColor: 'var(--surface)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Profile Info</h3>
                    <ThemeToggle />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 2fr', gap: '16px', alignItems: 'center', marginTop: '12px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--surface)',
                                color: 'var(--foreground)',
                                fontSize: '1rem',
                                width: '100%',
                                outline: 'none',
                                appearance: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--foreground-muted)' }}>▾</div>
                    </div>

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Height (in)</label>
                    <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="e.g. 70"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bodyweight (lbs)</label>
                    <input
                        type="number"
                        value={bodyweight}
                        onChange={(e) => setBodyweight(e.target.value)}
                        placeholder="e.g. 185"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />

                    <div style={{ gridColumn: '1 / -1', height: '1px', backgroundColor: 'var(--border)', margin: '8px 0' }} />

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Squat</label>
                    <input
                        type="number"
                        value={squat1RM}
                        onChange={(e) => setSquat1RM(e.target.value)}
                        placeholder="1RM (lbs)"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bench</label>
                    <input
                        type="number"
                        value={bench1RM}
                        onChange={(e) => setBench1RM(e.target.value)}
                        placeholder="1RM (lbs)"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />

                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadlift</label>
                    <input
                        type="number"
                        value={deadlift1RM}
                        onChange={(e) => setDeadlift1RM(e.target.value)}
                        placeholder="1RM (lbs)"
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>

                <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleSave}
                    style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <Save size={20} />
                    Save
                </Button>
            </div>

            <div style={{
                backgroundColor: 'var(--surface-secondary)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Data Management</h3>
                <p style={{ margin: 0, color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
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
