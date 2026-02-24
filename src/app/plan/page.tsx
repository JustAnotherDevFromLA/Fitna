"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { GoalEngine, SplitType, SessionPlan } from '../../lib/GoalEngine';
import { useToast } from '../../lib/ToastContext';

export default function PlanPage() {
    const [activeTab, setActiveTab] = useState<SplitType>('PPL');
    const [savedSplit, setSavedSplit] = useState<SplitType | null>(null);
    const toast = useToast();

    // Map the split string to a visual UI representation
    const splitNames: Record<SplitType, string> = {
        'PPL': 'Push Pull Legs',
        'UpperLower': 'Upper / Lower',
        'FullBody': 'Full Body'
    };

    useEffect(() => {
        const stored = localStorage.getItem('activeSplit') as SplitType | null;
        if (stored && splitNames[stored]) {
            setSavedSplit(stored);
            setActiveTab(stored);
        }
    }, [splitNames]);

    const handleSaveSplit = () => {
        localStorage.setItem('activeSplit', activeTab);
        setSavedSplit(activeTab);
        toast.success(`${splitNames[activeTab]} set as your Active Routine!`);
    };

    // Use GoalEngine's internal generation
    // Hack around private method by casting or we can just make it public in GoalEngine
    // I will update GoalEngine.ts to make generateSessionsForSplit public in the next step
    const routines: SessionPlan[] = GoalEngine.generateSessionsForSplit(activeTab);

    return (
        <main style={{ padding: '24px', color: 'white', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Weekly Split</h1>
                <p style={{ color: '#888', marginTop: '4px' }}>Select a training philosophy to guide your dashboard.</p>
            </header>

            {/* Split Selector Tabs */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#1a1a1a', padding: '6px', borderRadius: '12px' }}>
                {(Object.keys(splitNames) as SplitType[]).map((splitKey) => (
                    <button
                        key={splitKey}
                        onClick={() => setActiveTab(splitKey)}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            backgroundColor: activeTab === splitKey ? '#333' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: activeTab === splitKey ? '#fff' : '#888',
                            fontWeight: activeTab === splitKey ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {splitNames[splitKey]}
                    </button>
                ))}
            </div>

            {/* Routine Display Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {routines.map((dayPlan) => {
                    const isRest = dayPlan.focus.toLowerCase().includes('rest');
                    return (
                        <div key={dayPlan.day} style={{
                            backgroundColor: isRest ? 'transparent' : '#1a1a1a',
                            border: isRest ? '1px dashed #333' : '1px solid #333',
                            padding: '16px',
                            borderRadius: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ color: '#0070f3', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Day {dayPlan.day}</span>
                                <h3 style={{ margin: '4px 0 0 0', color: isRest ? '#888' : '#fff' }}>{dayPlan.focus}</h3>
                            </div>

                            {!isRest && (
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {dayPlan.exercises.slice(0, 3).map((ex, i) => (
                                        <span key={i} style={{ color: '#aaa', fontSize: '0.85rem' }}>{ex}</span>
                                    ))}
                                    {dayPlan.exercises.length > 3 && <span style={{ color: '#666', fontSize: '0.8rem' }}>+ more</span>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Action Bar */}
            <div style={{ position: 'sticky', bottom: '24px', marginTop: '16px' }}>
                {savedSplit === activeTab ? (
                    <Button variant="secondary" size="large" fullWidth style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                        Currently Active Split
                    </Button>
                ) : (
                    <Button variant="primary" size="large" fullWidth onClick={handleSaveSplit}>
                        Activate {splitNames[activeTab]}
                    </Button>
                )}
            </div>

        </main>
    );
}
