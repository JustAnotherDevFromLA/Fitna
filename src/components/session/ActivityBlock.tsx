import React, { useState } from 'react';
import { Activity, CardioActivity, MobilityActivity, WeightliftingActivity } from '../../models/Session';
import { Button } from '../ui/Button';
import { Trash, Edit2, Play, Plus, X } from 'lucide-react';
import { useToast } from '../../lib/ToastContext';

interface ActivityBlockProps {
    activity: Activity;
    onRemove: (id: string) => void;
    onUpdate: (activity: Activity) => void;
}

export const ActivityBlock: React.FC<ActivityBlockProps> = ({ activity, onRemove, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const toast = useToast();

    const renderIcon = () => {
        switch (activity.type) {
            case 'cardio': return '🏃';
            case 'weightlifting': return '🏋️';
            case 'mobility': return '🧘';
            default: return '⚡';
        }
    };

    const renderDetails = () => {
        switch (activity.type) {
            case 'cardio': {
                const c = activity as CardioActivity;
                return (
                    <div style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                        {c.distance ? `${c.distance} units` : 'Distance pending'} • {c.duration ? `${c.duration} mins` : 'Time pending'}
                    </div>
                );
            }
            case 'mobility': {
                const m = activity as MobilityActivity;
                return (
                    <div style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                        {m.duration} mins • {m.flowType || 'General'}
                    </div>
                );
            }
            case 'weightlifting': {
                const w = activity as WeightliftingActivity;
                const totalVolume = w.sets.reduce((acc, set) => acc + (set.weight * set.reps), 0);
                return (
                    <div style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                        {w.sets.length} sets planned • Vol: {totalVolume}lbs
                    </div>
                );
            }
        }
    };

    const handleRemoveClick = () => {
        toast.confirm(`Are you sure you want to remove ${activity.name}?`, () => {
            onRemove(activity.id);
            toast.success(`${activity.name} removed from session.`);
        });
    };

    if (isEditing) {
        return (
            <div style={{
                backgroundColor: 'var(--surface-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--primary)', marginBottom: '12px'
            }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Activity Name</label>
                <input
                    type="text"
                    list="exercise-suggestions"
                    value={activity.name}
                    onChange={(e) => onUpdate({ ...activity, name: e.target.value })}
                    style={{ width: '100%', padding: '12px', backgroundColor: 'var(--surface)', border: 'none', borderRadius: '8px', color: 'var(--foreground)', fontSize: '1.1rem', marginBottom: '16px' }}
                />
                <datalist id="exercise-suggestions">
                    <option value="Bench Press" />
                    <option value="Incline Bench Press" />
                    <option value="Dumbbell Press" />
                    <option value="Overhead Press" />
                    <option value="Lateral Raises" />
                    <option value="Squat" />
                    <option value="Front Squat" />
                    <option value="Deadlift" />
                    <option value="Romanian Deadlift" />
                    <option value="Leg Press" />
                    <option value="Pull-ups" />
                    <option value="Lat Pulldown" />
                    <option value="Barbell Row" />
                    <option value="Bicep Curls" />
                    <option value="Tricep Extensions" />
                </datalist>

                {activity.type === 'cardio' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Distance</label>
                            <input
                                type="number"
                                value={(activity as CardioActivity).distance || ''}
                                onChange={(e) => onUpdate({ ...activity, distance: Number(e.target.value) } as CardioActivity)}
                                placeholder="e.g. 3"
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--surface)', border: 'none', borderRadius: '6px', color: 'var(--foreground)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Duration (mins)</label>
                            <input
                                type="number"
                                value={(activity as CardioActivity).duration || ''}
                                onChange={(e) => onUpdate({ ...activity, duration: Number(e.target.value) } as CardioActivity)}
                                placeholder="e.g. 30"
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--surface)', border: 'none', borderRadius: '6px', color: 'var(--foreground)' }}
                            />
                        </div>
                    </div>
                )}

                {activity.type === 'mobility' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Duration (mins)</label>
                            <input
                                type="number"
                                value={(activity as MobilityActivity).duration || ''}
                                onChange={(e) => onUpdate({ ...activity, duration: Number(e.target.value) } as MobilityActivity)}
                                placeholder="e.g. 15"
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--surface)', border: 'none', borderRadius: '6px', color: 'var(--foreground)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Flow Type</label>
                            <input
                                type="text"
                                value={(activity as MobilityActivity).flowType || ''}
                                onChange={(e) => onUpdate({ ...activity, flowType: e.target.value } as MobilityActivity)}
                                placeholder="e.g. Upper Body Stretch"
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--surface)', border: 'none', borderRadius: '6px', color: 'var(--foreground)' }}
                            />
                        </div>
                    </div>
                )}

                {activity.type === 'weightlifting' && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Sets (Weight lbs x Reps)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(activity as WeightliftingActivity).sets.map((set, idx) => (
                                <div key={set.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', width: '20px' }}>{idx + 1}.</span>
                                    <input
                                        type="number"
                                        value={set.weight}
                                        onChange={(e) => {
                                            const newSets = [...(activity as WeightliftingActivity).sets];
                                            newSets[idx] = { ...set, weight: Number(e.target.value) };
                                            onUpdate({ ...activity, sets: newSets } as WeightliftingActivity);
                                        }}
                                        style={{ width: '80px', padding: '8px', backgroundColor: 'var(--surface)', border: 'none', borderRadius: '6px', color: 'var(--foreground)', textAlign: 'center' }}
                                    />
                                    <span style={{ color: 'var(--foreground-muted)' }}>x</span>
                                    <input
                                        type="number"
                                        value={set.reps}
                                        onChange={(e) => {
                                            const newSets = [...(activity as WeightliftingActivity).sets];
                                            newSets[idx] = { ...set, reps: Number(e.target.value) };
                                            onUpdate({ ...activity, sets: newSets } as WeightliftingActivity);
                                        }}
                                        style={{ width: '80px', padding: '8px', backgroundColor: 'var(--surface)', border: 'none', borderRadius: '6px', color: 'var(--foreground)', textAlign: 'center' }}
                                    />
                                    <button
                                        onClick={() => {
                                            const newSets = [...(activity as WeightliftingActivity).sets].filter((_, i) => i !== idx);
                                            onUpdate({ ...activity, sets: newSets } as WeightliftingActivity);
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            <Button
                                variant="ghost"
                                size="normal"
                                onClick={() => {
                                    const w = activity as WeightliftingActivity;
                                    const lastSet = w.sets.length > 0 ? w.sets[w.sets.length - 1] : { weight: 135, reps: 5 };
                                    const newSet = { id: `set_${Date.now()}`, weight: lastSet.weight, reps: lastSet.reps };
                                    onUpdate({ ...activity, sets: [...w.sets, newSet] } as WeightliftingActivity);
                                }}
                                style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                            >
                                <Plus size={16} style={{ marginRight: '4px' }} /> Add Set
                            </Button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <Button variant="ghost" size="normal" onClick={() => setIsEditing(false)}>Done</Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: 'var(--surface-secondary)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            boxShadow: 'var(--shadow-modal)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '1.5rem', backgroundColor: 'var(--surface)', padding: '12px', borderRadius: '50%' }}>
                    {renderIcon()}
                </div>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--foreground)' }}>{activity.name}</h4>
                    {renderDetails()}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                {/* Placeholder for "Start intra-session tracker" functionality */}
                {activity.type === 'weightlifting' && (
                    <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px' }}>
                        <Play size={20} />
                    </button>
                )}
                <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', padding: '8px' }}>
                    <Edit2 size={20} />
                </button>
                <button onClick={handleRemoveClick} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px' }}>
                    <Trash size={20} />
                </button>
            </div>
        </div>
    );
};
