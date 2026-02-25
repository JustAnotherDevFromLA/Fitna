"use client";

import React, { useState, useEffect } from 'react';
import { X, GripVertical, Trash2, Plus, Play, SaveIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { WeightliftingActivity, Activity } from '../../models/Session';
import { SessionPlan } from '../../lib/GoalEngine';

interface EditSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    todaysPlan: SessionPlan | null;
    isRestDay: boolean;
    onSave: (activities: Activity[]) => void;
}

export function EditSessionModal({ isOpen, onClose, todaysPlan, isRestDay, onSave }: EditSessionModalProps) {
    const [draftActivities, setDraftActivities] = useState<Activity[]>([]); const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
    // Hydrate the draft list when the modal opens based on the actual plan
    useEffect(() => {
        if (isOpen && todaysPlan && !isRestDay) {
            const initial: Activity[] = todaysPlan.exercises.map((exName, index) => {
                const randomSuffix = Math.random().toString(36).substring(7);
                return {
                    id: `draft_${Date.now()}_${index}_${randomSuffix}`,
                    type: 'weightlifting',
                    name: exName,
                    sets: [{ id: `dset_${Date.now()}_${index}_0_${randomSuffix}`, weight: 0, reps: 0 }]
                } as WeightliftingActivity;
            });
            setDraftActivities(initial);
        } else if (isOpen && isRestDay) {
            setDraftActivities([]);
        }
    }, [isOpen, todaysPlan, isRestDay]);

    if (!isOpen) return null;

    const handleAddExercise = () => {
        const randomSuffix = Math.random().toString(36).substring(7);
        const newEx: WeightliftingActivity = {
            id: `draft_${Date.now()}_${randomSuffix}`,
            type: 'weightlifting',
            name: 'New Exercise',
            sets: [{ id: `dset_${Date.now()}_0_${randomSuffix}`, weight: 0, reps: 0 }]
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

    // Drag-and-drop handlers

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;
        const newList = [...draftActivities];
        const [moved] = newList.splice(draggedIdx, 1);
        newList.splice(index, 0, moved);
        setDraggedIdx(index);
        setDraftActivities(newList);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
    };

    // Removed up/down move for accessibility to simplify UX

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'var(--overlay)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            overflowY: 'auto', padding: '24px 16px', backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .edit-item:hover { background-color: var(--surface-hover) !important; }
            `}} />

            <div style={{
                backgroundColor: 'var(--background)', width: '100%', maxWidth: '500px',
                borderRadius: '24px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: 'var(--shadow-modal)', marginBottom: '40px'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--foreground)' }}>Configure Session</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
                            {isRestDay ? 'Active Recovery' : todaysPlan?.focus || 'Custom Workout'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: 'var(--foreground-muted)',
                        cursor: 'pointer', padding: '8px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                        backgroundColor: 'var(--surface-secondary)'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Exercise List */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {draftActivities.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--foreground-muted)' }}>
                            <p style={{ marginBottom: '16px' }}>No exercises planned for today.</p>
                        </div>
                    ) : (
                        draftActivities.map((act, idx) => (
                            <div key={act.id} className="edit-item" style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 16px', backgroundColor: 'var(--surface)',
                                borderRadius: '12px', border: '1px solid var(--border)',
                                transition: 'background-color 0.2s',
                                cursor: 'grab'
                            }}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => e.preventDefault()}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <GripVertical size={16} style={{ color: 'var(--foreground-muted)' }} />
                                </div>

                                <input
                                    type="text"
                                    value={act.name}
                                    onChange={(e) => handleRenameExercise(act.id, e.target.value)}
                                    style={{
                                        flex: 1, backgroundColor: 'transparent',
                                        border: 'none', color: 'var(--foreground)', fontSize: '1rem',
                                        fontWeight: 600, outline: 'none'
                                    }}
                                />

                                <button onClick={() => handleRemoveExercise(act.id)} style={{
                                    background: 'none', border: 'none', color: 'var(--danger)',
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
                    padding: '20px 24px', borderTop: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)', display: 'flex', gap: '12px'
                }}>
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => {
                        onSave(draftActivities);
                        onClose();
                    }}>
                        <SaveIcon size={18} style={{ marginRight: '8px', fill: 'none' }} />
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}
