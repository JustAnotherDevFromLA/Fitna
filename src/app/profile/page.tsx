"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../lib/ToastContext';

export default function ProfilePage() {
    const [squat1RM, setSquat1RM] = useState<string>('');
    const [bench1RM, setBench1RM] = useState<string>('');
    const [deadlift1RM, setDeadlift1RM] = useState<string>('');
    const toast = useToast();

    useEffect(() => {
        // Load existing targets
        const sq = localStorage.getItem('1RM_Squat');
        const bn = localStorage.getItem('1RM_Bench');
        const dl = localStorage.getItem('1RM_Deadlift');
        if (sq) setSquat1RM(sq);
        if (bn) setBench1RM(bn);
        if (dl) setDeadlift1RM(dl);
    }, []);

    const handleSave = () => {
        localStorage.setItem('1RM_Squat', squat1RM);
        localStorage.setItem('1RM_Bench', bench1RM);
        localStorage.setItem('1RM_Deadlift', deadlift1RM);
        toast.success('1RM Targets Saved successfully!');
    };

    return (
        <main style={{ padding: '24px', color: 'white', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Profile</h1>
                <p style={{ color: '#888', marginTop: '4px' }}>Configure your baseline stats for the Goal Engine.</p>
            </header>

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

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                    <label style={{ fontWeight: 600, color: '#ccc' }}>Squat</label>
                    <input
                        type="number"
                        value={squat1RM}
                        onChange={(e) => setSquat1RM(e.target.value)}
                        placeholder="e.g. 315"
                        style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2c2c2c', color: 'white', fontSize: '1.1rem', width: '100%' }}
                    />

                    <label style={{ fontWeight: 600, color: '#ccc' }}>Bench</label>
                    <input
                        type="number"
                        value={bench1RM}
                        onChange={(e) => setBench1RM(e.target.value)}
                        placeholder="e.g. 225"
                        style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2c2c2c', color: 'white', fontSize: '1.1rem', width: '100%' }}
                    />

                    <label style={{ fontWeight: 600, color: '#ccc' }}>Deadlift</label>
                    <input
                        type="number"
                        value={deadlift1RM}
                        onChange={(e) => setDeadlift1RM(e.target.value)}
                        placeholder="e.g. 405"
                        style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2c2c2c', color: 'white', fontSize: '1.1rem', width: '100%' }}
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
        </main>
    );
}
