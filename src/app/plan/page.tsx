"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '../../components/ui/Button';
import { GoalEngine, SplitType, SessionPlan } from '../../lib/GoalEngine';
import { useToast } from '../../lib/ToastContext';
import { Trash, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekSundayString, resolveActiveSplitForDate } from '../../lib/utils';
import { dbStore } from '../../lib/db';

// Map the split string to a visual UI representation
const splitNames: Record<SplitType, string> = {
    'PPL': 'Push Pull Legs',
    'UpperLower': 'Upper / Lower',
    'FullBody': 'Full Body'
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


function PlanPlanner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editDayParam = searchParams.get('editDay');

    // Default to the current week if no query parameter is provided
    const [currentWeekSunday, setCurrentWeekSunday] = useState<Date>(
        searchParams.get('week')
            ? new Date(`${searchParams.get('week')}T00:00:00`)
            : new Date()
    );

    const [activeTab, setActiveTab] = useState<SplitType>('PPL');
    const [savedSplit, setSavedSplit] = useState<SplitType | null>(null);
    const [customPlan, setCustomPlan] = useState<SessionPlan[] | null>(null);
    const [editingDay, setEditingDay] = useState<SessionPlan | null>(null);
    const toast = useToast();

    // The working routines array for the current view
    const routines: SessionPlan[] = customPlan && savedSplit === activeTab
        ? customPlan
        : GoalEngine.generateSessionsForSplit(activeTab);

    useEffect(() => {
        // Resolve the split specifically for the week we are currently viewing
        const resolved = resolveActiveSplitForDate(currentWeekSunday);

        // Timeout is necessary to escape React strict-mode double mount collisions with IDB
        setTimeout(() => {
            setSavedSplit(resolved.splitType);
            setActiveTab(resolved.splitType);

            if (resolved.customItems) {
                setCustomPlan(resolved.customItems);

                if (editDayParam) {
                    const dayInt = parseInt(editDayParam);
                    const target = resolved.customItems.find(r => r.day === dayInt);
                    if (target) setEditingDay(target);
                }
            } else if (editDayParam) {
                const baseRoutines = GoalEngine.generateSessionsForSplit(resolved.splitType);
                const dayInt = parseInt(editDayParam);
                const target = baseRoutines.find(r => r.day === dayInt);
                if (target) setEditingDay(target);
            }
        }, 0);

    }, [currentWeekSunday, editDayParam]);

    const handleSaveSplit = () => {
        const weekKey = getWeekSundayString(currentWeekSunday);
        localStorage.setItem(`activeSplit_${weekKey}`, activeTab);

        // If they are saving a brand new generic split over a custom one, flush custom modifications
        if (activeTab !== savedSplit) {
            localStorage.removeItem(`customSplitItems_${weekKey}`);
            setCustomPlan(null);
        }

        setSavedSplit(activeTab);
        toast.success(`${splitNames[activeTab]} set for week of ${currentWeekSunday.toLocaleDateString()}`);

        // Trigger background sync
        dbStore.syncPendingSessions().catch(console.error);

        router.push('/');
    };

    const saveDayEdits = (updatedDay: SessionPlan) => {
        const newPlan = customPlan ? [...customPlan] : [...routines];
        const index = newPlan.findIndex(d => d.day === updatedDay.day);
        if (index !== -1) {
            newPlan[index] = updatedDay;
        }

        setCustomPlan(newPlan);
        setEditingDay(null);

        // If this is currently the active tracked split, automatically save edits to disk for this week
        if (activeTab === savedSplit) {
            const weekKey = getWeekSundayString(currentWeekSunday);
            localStorage.setItem(`customSplitItems_${weekKey}`, JSON.stringify(newPlan));
            dbStore.syncPendingSessions().catch(console.error);
        }
    };

    const handleWeekNav = (direction: 'prev' | 'next') => {
        const d = new Date(currentWeekSunday);
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeekSunday(d);
        // Clean out pending edits and view state during navigation
        setCustomPlan(null);
        setActiveTab('PPL');
        setSavedSplit(null);
    };

    const handleGenerateMacrocycle = () => {
        if (!confirm(`Are you sure you want to generate a 12-Week ${splitNames[activeTab]} Block? This will overwrite your planned schedules for the next 3 months.`)) return;

        const block = GoalEngine.generateBlock('General Fitness', 'hypertrophy', 12, activeTab);

        // Starting from the currently viewed week, iterate 12 times forwards
        const weekCursor = new Date(currentWeekSunday);

        block.weeks.forEach(weekPlan => {
            const weekKey = getWeekSundayString(weekCursor);
            localStorage.setItem(`activeSplit_${weekKey}`, activeTab);
            localStorage.setItem(`customSplitItems_${weekKey}`, JSON.stringify(weekPlan.sessions));

            // Step forward 1 week
            weekCursor.setDate(weekCursor.getDate() + 7);
        });

        // Force a re-render of this week by pushing state
        setSavedSplit(activeTab);
        setCustomPlan(block.weeks[0].sessions);
        toast.success(`Generated 12-Week ${splitNames[activeTab]} Block successfully!`);

        dbStore.syncPendingSessions().catch(console.error);
    };

    return (
        <main style={{ padding: '24px', color: 'white', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Weekly Split</h1>
                    <p style={{ color: '#888', marginTop: '4px', fontSize: '0.9rem' }}>
                        Week of {getWeekSundayString(currentWeekSunday)}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => handleWeekNav('prev')}
                        style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '8px', color: '#fff', cursor: 'pointer' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => handleWeekNav('next')}
                        style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '8px', color: '#fff', cursor: 'pointer' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
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
                        <div
                            key={dayPlan.day}
                            onClick={() => setEditingDay(dayPlan)}
                            style={{
                                backgroundColor: isRest ? 'transparent' : '#1a1a1a',
                                border: isRest ? '1px dashed #333' : '1px solid #333',
                                padding: '16px',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}>
                            <div>
                                <span style={{ color: '#0070f3', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Day {dayPlan.day} • {dayNames[dayPlan.day - 1]}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', bottom: '24px', marginTop: '16px' }}>
                <Button variant={savedSplit === activeTab ? "secondary" : "primary"} size="large" fullWidth onClick={handleSaveSplit}>
                    {savedSplit === activeTab ? 'Save Edits & Return Home' : `Activate ${splitNames[activeTab]}`}
                </Button>

                <div style={{
                    backgroundColor: 'rgba(0,112,243,0.05)',
                    border: '1px solid #0070f3',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '12px'
                }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#0070f3', fontSize: '1.1rem' }}>Training Block Generator</h3>
                        <p style={{ margin: 0, color: '#ccc', fontSize: '0.85rem' }}>Instantly program a 12-week macrocycle featuring progressive intensity and automatic deloads.</p>
                    </div>
                    <Button variant="primary" size="small" style={{ backgroundColor: '#0070f3', color: 'white' }} onClick={handleGenerateMacrocycle}>
                        Generate 12-Week Block
                    </Button>
                </div>
            </div>

            {/* Editing Modal */}
            {editingDay && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#111', width: '100%', maxWidth: '600px',
                        borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                        padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>Edit Day {editingDay.day} • {dayNames[editingDay.day - 1]}</h2>
                            <button onClick={() => setEditingDay(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.9rem', marginBottom: '8px' }}>Focus / Name</label>
                            <input
                                type="text"
                                value={editingDay.focus}
                                onChange={(e) => setEditingDay({ ...editingDay, focus: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#222', border: '1px solid #333', color: '#fff', fontSize: '1rem' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.9rem', marginBottom: '8px' }}>Exercises</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {editingDay.exercises.map((ex, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={ex}
                                            onChange={(e) => {
                                                const newEx = [...editingDay.exercises];
                                                newEx[idx] = e.target.value;
                                                setEditingDay({ ...editingDay, exercises: newEx });
                                            }}
                                            style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#222', border: '1px solid #333', color: '#fff', fontSize: '1rem' }}
                                        />
                                        <button
                                            onClick={() => {
                                                const newEx = editingDay.exercises.filter((_, i) => i !== idx);
                                                setEditingDay({ ...editingDay, exercises: newEx });
                                            }}
                                            style={{ padding: '0 16px', backgroundColor: '#331111', color: '#ff4d4f', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setEditingDay({ ...editingDay, exercises: [...editingDay.exercises, ''] })}
                                style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                            >
                                <Plus size={18} /> Add Exercise
                            </button>
                        </div>

                        <Button variant="primary" size="large" fullWidth onClick={() => saveDayEdits(editingDay)} style={{ marginTop: '16px' }}>
                            Save Day {editingDay.day} • {dayNames[editingDay.day - 1]}
                        </Button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function PlanPage() {
    return (
        <Suspense fallback={<div style={{ padding: '24px', color: 'white' }}>Loading Planner...</div>}>
            <PlanPlanner />
        </Suspense>
    );
}
