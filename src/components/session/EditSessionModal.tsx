"use client";

import React, { useState, useEffect } from 'react';
import { X, GripVertical, Trash2, Plus, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { WeightliftingActivity, Activity } from '../../models/Session';
import { SessionPlan } from '../../lib/GoalEngine';

interface EditSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    todaysPlan: SessionPlan | null;
    isRestDay: boolean;
    onStartWorkout: (activities: Activity[]) => void;
}

export function EditSessionModal({ isOpen, onClose, todaysPlan, isRestDay, onStartWorkout }: EditSessionModalProps) {
    const [draftActivities, setDraftActivities] = useState<Activity[]>([]);

    // Hydrate the draft list when the modal opens based on the actual plan
    useEffect(() => {
        if (isOpen && todaysPlan && !isRestDay) {
            const initial: Activity[] = todaysPlan.exercises.map((exName, index) => {
                return {
                    id: `draft_${Date.now()}_${index}`,
                    type: 'weightlifting',
                    name: exName,
                    sets: [{ id: `dset_${Date.now()}_${index}_0`, weight: 0, reps: 0 }]
                } as WeightliftingActivity;
            });
            setDraftActivities(initial);
        } else if (isOpen && isRestDay) {
            setDraftActivities([]);
        }
    }, [isOpen, todaysPlan, isRestDay]);

    if (!isOpen) return null;

    const handleAddExercise = () => {
        const newEx: WeightliftingActivity = {
            id: `draft_${Date.now()}`,
            type: 'weightlifting',
            name: 'New Exercise',
            sets: [{ id: `dset_${Date.now()}_0`, weight: 0, reps: 0 }]
        };
        setDraftActivities([...draftActivities, newEx]);
    };

    const handleRemoveExercise = (idToRemove: string) => {
        setDraftActivities(draftActivities.filter(a => a.id !== idToRemove));
    };

    const handleRenameExercise = (id: string, newName: string) => {
        setDraftActivities(draftActivities.map(a =>
            a.id === id ? { ...a, name: newName } : a
        ));
    };

    const moveActivity = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === draftActivities.length - 1)
        ) return;

        const newList = [...draftActivities];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newList[index];
        newList[index] = newList[swapIndex];
        newList[swapIndex] = temp;
        setDraftActivities(newList);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            overflowY: 'auto', padding: '24px 16px', backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .edit-item:hover { background-color: #222 !important; }
            `}} />

            <div style={{
                backgroundColor: '#111', width: '100%', maxWidth: '500px',
                borderRadius: '24px', border: '1px solid #333',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)', marginBottom: '40px'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: '1px solid #222', backgroundColor: '#1a1a1a'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Configure Session</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#888' }}>
                            {isRestDay ? 'Active Recovery' : todaysPlan?.focus || 'Custom Workout'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: '#888',
                        cursor: 'pointer', padding: '8px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                        backgroundColor: '#222'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Exercise List */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {draftActivities.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                            <p style={{ marginBottom: '16px' }}>No exercises planned for today.</p>
                        </div>
                    ) : (
                        draftActivities.map((act, idx) => (
                            <div key={act.id} className="edit-item" style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 16px', backgroundColor: '#161616',
                                borderRadius: '12px', border: '1px solid #222',
                                transition: 'background-color 0.2s'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <button
                                        onClick={() => moveActivity(idx, 'up')}
                                        disabled={idx === 0}
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#333' : '#888' }}
                                    >
                                        <div style={{ transform: 'rotate(180deg)' }}>▾</div>
                                    </button>
                                    <button
                                        onClick={() => moveActivity(idx, 'down')}
                                        disabled={idx === draftActivities.length - 1}
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: idx === draftActivities.length - 1 ? 'default' : 'pointer', color: idx === draftActivities.length - 1 ? '#333' : '#888' }}
                                    >
                                        ▾
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={act.name}
                                    onChange={(e) => handleRenameExercise(act.id, e.target.value)}
                                    style={{
                                        flex: 1, backgroundColor: 'transparent',
                                        border: 'none', color: '#fff', fontSize: '1rem',
                                        fontWeight: 600, outline: 'none'
                                    }}
                                />

                                <button onClick={() => handleRemoveExercise(act.id)} style={{
                                    background: 'none', border: 'none', color: '#ff4d4f',
                                    cursor: 'pointer', padding: '8px', opacity: 0.8
                                }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}

                    <Button variant="secondary" onClick={handleAddExercise} style={{ marginTop: '8px', borderStyle: 'dashed' }}>
                        <Plus size={16} /> Add Exercise
                    </Button>
                </div>

                {/* Footer - Lock Actions */}
                <div style={{
                    padding: '20px 24px', borderTop: '1px solid #222',
                    backgroundColor: '#1a1a1a', display: 'flex', gap: '12px'
                }}>
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => {
                        onStartWorkout(draftActivities);
                        onClose();
                    }}>
                        <Play size={18} style={{ marginRight: '8px', fill: 'currentColor' }} />
                        Start Session
                    </Button>
                </div>
            </div>
        </div>
    );
}
