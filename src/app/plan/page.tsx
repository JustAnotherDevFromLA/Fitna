"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '../../components/ui/Button';
import { GoalEngine, SplitType, SessionPlan } from '../../lib/GoalEngine';
import { useToast } from '../../lib/ToastContext';
import { Trash, Plus, X, ChevronLeft, ChevronRight, Save } from 'lucide-react';
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

    const weekStart = new Date(currentWeekSunday);
    const weekEnd = new Date(currentWeekSunday);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const formatShortDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    const weekDateString = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;

    // Calculate Week Number of the Year
    const getWeekNumber = (d: Date) => {
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const currentYear = weekStart.getFullYear();
    const currentWeekNum = getWeekNumber(weekStart);

    return (
        <main style={{ padding: '24px', color: 'var(--foreground)', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                    onClick={() => handleWeekNav('prev')}
                    style={{ background: 'none', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
                >
                    <ChevronLeft size={24} />
                </button>

                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>{currentYear} Week {currentWeekNum}</h1>
                    <p style={{ color: 'var(--foreground-muted)', marginTop: '4px', fontSize: '0.9rem', fontWeight: 600 }}>
                        {weekDateString}
                    </p>
                </div>

                <button
                    onClick={() => handleWeekNav('next')}
                    style={{ background: 'none', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
                >
                    <ChevronRight size={24} />
                </button>
            </header>

            {/* Split Selector Tabs */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--surface-secondary)', padding: '6px', borderRadius: '12px' }}>
                {(Object.keys(splitNames) as SplitType[]).map((splitKey) => (
                    <button
                        key={splitKey}
                        onClick={() => setActiveTab(splitKey)}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            backgroundColor: activeTab === splitKey ? 'var(--surface-hover)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: activeTab === splitKey ? 'var(--foreground)' : 'var(--foreground-muted)',
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
                                backgroundColor: isRest ? 'transparent' : 'var(--surface-secondary)',
                                border: isRest ? '1px dashed var(--border)' : '1px solid var(--border)',
                                padding: '16px',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}>
                            <div>
                                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Day {dayPlan.day} • {dayNames[dayPlan.day - 1]}</span>
                                <h3 style={{ margin: '4px 0 0 0', color: isRest ? 'var(--foreground-muted)' : 'var(--foreground)' }}>{dayPlan.focus}</h3>
                            </div>

                            {!isRest && (
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {dayPlan.exercises.slice(0, 3).map((ex, i) => (
                                        <span key={i} style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>{ex}</span>
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
                <Button variant="primary" size="large" fullWidth onClick={handleSaveSplit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Save size={20} />
                    {savedSplit === activeTab ? 'Save' : `Activate ${splitNames[activeTab]}`}
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
                    backgroundColor: 'var(--overlay)',
                    zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: 'var(--background)', width: '100%', maxWidth: '600px',
                        borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                        border: '1px solid var(--border)',
                        padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--foreground)' }}>Edit Day {editingDay.day} • {dayNames[editingDay.day - 1]}</h2>
                            <button onClick={() => setEditingDay(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--foreground-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Focus / Name</label>
                            <input
                                type="text"
                                value={editingDay.focus}
                                onChange={(e) => setEditingDay({ ...editingDay, focus: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '1rem' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--foreground-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Exercises</label>
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
                                            style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: '1rem' }}
                                        />
                                        <button
                                            onClick={() => {
                                                const newEx = editingDay.exercises.filter((_, i) => i !== idx);
                                                setEditingDay({ ...editingDay, exercises: newEx });
                                            }}
                                            style={{ padding: '0 16px', backgroundColor: 'var(--primary-light)', color: 'var(--danger)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setEditingDay({ ...editingDay, exercises: [...editingDay.exercises, ''] })}
                                style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                            >
                                <Plus size={18} /> Add Exercise
                            </button>
                        </div>

                        <Button variant="primary" size="large" fullWidth onClick={() => saveDayEdits(editingDay)} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Save size={20} />
                            Save
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
