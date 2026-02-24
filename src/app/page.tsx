"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { useSessionStore } from '../lib/store';
import { WeeklyCalendar } from '../components/ui/WeeklyCalendar';
import { getDynamicSessionTitle, resolveActiveSplitForDate, getWeekSundayString } from '../lib/utils';
import { ActivityBlock } from '../components/session/ActivityBlock';
import { Clock } from 'lucide-react';
import { dbStore } from '../lib/db';
import { GoalEngine, SplitType, SessionPlan } from '../lib/GoalEngine';
import { Session, WeightliftingActivity, CardioActivity, MobilityActivity } from '../models/Session';
import { EditSessionModal } from '../components/session/EditSessionModal';
import { LogSessionModal } from '../components/session/LogSessionModal';

export default function Home() {
  const { activeSession, pauseSession, resumeSession, removeActivity, updateActivity, addActivityToSession, endSession, startNewSession, loadActiveSession } = useSessionStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>(
    `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`
  );
  const [activeSplit, setActiveSplit] = useState<SplitType | null>(null);
  const [customSplit, setCustomSplit] = useState<SessionPlan[] | null>(null);
  const [activeElapsed, setActiveElapsed] = useState<number>(0);
  const [totalElapsed, setTotalElapsed] = useState<number>(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [dailySessions, setDailySessions] = useState<Session[]>([]);
  const [todaysPlan, setTodaysPlan] = useState<SessionPlan | null>(null);

  // Modal Control States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Phase 29: Hydrate active workout from IndexedDB on initial mount
  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  // Phase 17/30/33: Hydrate Active Split plan from LocalStorage, temporally aware
  useEffect(() => {
    // Resolve the split for the currently selected date's week
    setTimeout(() => {
      const resolved = resolveActiveSplitForDate(selectedDate);
      setActiveSplit(resolved.splitType);
      setCustomSplit(resolved.customItems);
    }, 0);
  }, [selectedDate]);

  useEffect(() => {
    async function loadDailySessions() {
      try {
        const allSessions = await dbStore.getAllSessions();
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const logs = allSessions.filter(s =>
          s.endTime && // Only completed sessions
          s.startTime >= startOfDay.getTime() &&
          s.startTime <= endOfDay.getTime()
        );
        // Sort newest first
        setDailySessions(logs.sort((a, b) => b.startTime - a.startTime));
      } catch (err) {
        console.error("Failed to load daily sessions from IndexedDB", err);
      }
    }
    loadDailySessions();
  }, [selectedDate, activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (activeSession && !activeSession.endTime) {
      const getActiveDuration = () => {
        if (activeSession.status === 'paused' && activeSession.pausedAt) {
          return activeSession.pausedAt - activeSession.startTime - (activeSession.totalPausedMs || 0);
        }
        return Date.now() - activeSession.startTime - (activeSession.totalPausedMs || 0);
      };

      const getTotalDuration = () => {
        return Date.now() - activeSession.startTime;
      };

      setTimeout(() => {
        setActiveElapsed(getActiveDuration());
        setTotalElapsed(getTotalDuration());
      }, 0);

      // Total clock always ticks, Active clock only ticks if not paused
      interval = setInterval(() => {
        setTotalElapsed(getTotalDuration());
        if (activeSession.status !== 'paused') {
          setActiveElapsed(getActiveDuration());
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  // Phase 27 / 31: Inline Rest Timer hook logic w/ Auto Pause
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => prev - 1);
      }, 1000);
    } else if (restSeconds === 0 && isTimerActive) {
      setTimeout(() => {
        setIsTimerActive(false);
        resumeSession(); // Phase 31: Auto Resume when rest is over
      }, 0);
      // In a real device we'd fire a vibration ping here
    }
    return () => clearInterval(interval);
  }, [isTimerActive, restSeconds, resumeSession]);

  // Helper function to format elapsed time
  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const startRest = (seconds: number) => {
    pauseSession();
    setRestSeconds(seconds);
    setIsTimerActive(true);
  };

  const skipRest = () => {
    setRestSeconds(0);
    setIsTimerActive(false);
    resumeSession();
  };

  const handleManualPauseResume = () => {
    setRestSeconds(0);
    setIsTimerActive(false);
    if (activeSession?.status === 'paused') {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateBlock = (type: 'weightlifting' | 'cardio' | 'mobility') => {
    const baseId = `act_${Date.now()}`;

    if (type === 'weightlifting') {
      const w: WeightliftingActivity = {
        id: baseId,
        type: 'weightlifting',
        name: 'New Lift',
        sets: [{ id: `set_${Date.now()}`, weight: 135, reps: 5 }]
      };
      addActivityToSession(w);
    } else if (type === 'cardio') {
      const c: CardioActivity = {
        id: baseId,
        type: 'cardio',
        name: 'Zone 2 Run',
        duration: 1800, // 30 mins
        distance: 3
      };
      addActivityToSession(c);
    } else {
      const m: MobilityActivity = {
        id: baseId,
        type: 'mobility',
        name: 'Yoga Flow',
        duration: 900
      };
      addActivityToSession(m);
    }
  };

  const todayString = new Date().toLocaleDateString();
  const selectedString = selectedDate.toLocaleDateString();
  const isToday = todayString === selectedString;

  const todayDateObj = new Date(todayString);
  const selectedDateObj = new Date(selectedString);
  const isFuture = selectedDateObj.getTime() > todayDateObj.getTime();

  const getGoalEngineDay = (d: Date) => {
    return d.getDay() + 1;
  };

  // Moved this logic here to be able to set `todaysPlan` state
  useEffect(() => {
    if (activeSplit) {
      const routines = customSplit || GoalEngine.generateSessionsForSplit(activeSplit);
      const targetDay = getGoalEngineDay(selectedDate);
      setTodaysPlan(routines.find(r => r.day === targetDay) || null);
    } else {
      setTodaysPlan(null);
    }
  }, [activeSplit, customSplit, selectedDate]);

  const isRestDay = todaysPlan?.focus.toLowerCase().includes('rest');

  const hardDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  // Serialize initial exercises for cross-day routing
  const initialExercisesParam = (todaysPlan && todaysPlan.exercises.length > 0 && !isRestDay)
    ? `&exercises=${encodeURIComponent(JSON.stringify(todaysPlan.exercises))}`
    : '';

  const sessionNameParam = (todaysPlan && !isRestDay)
    ? `&name=${encodeURIComponent(todaysPlan.focus)}`
    : (isRestDay ? `&name=Active%20Recovery` : '');

  const dateQuery = !isToday
    ? `?date=${hardDateStr}&time=${selectedTime}${initialExercisesParam}${sessionNameParam}`
    : `?time=${selectedTime}${initialExercisesParam}${sessionNameParam}`;

  const weekSundayStr = getWeekSundayString(selectedDate);

  return (
    <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center', maxWidth: '600px', margin: '0 auto' }}>

      {/* Dynamic Weekly Calendar */}
      <WeeklyCalendar
        selectedDate={selectedDate}
        onSelectDate={(d) => {
          setSelectedDate(d);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const selected = new Date(d);
          selected.setHours(0, 0, 0, 0);
          if (selected.getTime() > today.getTime()) {
            setSelectedTime('09:00');
          } else if (selected.getTime() === today.getTime()) {
            setSelectedTime(`${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`);
          }
        }}
      />

      {/* Main Call to Action */}
      <div style={{ width: '100%', marginTop: '8px' }}>
        <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>{isToday ? "Today's Plan" : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h2>

        {/* Weekly Split Focus Card */}
        {todaysPlan && (
          <div
            onClick={() => setIsEditModalOpen(true)}
            style={{
              backgroundColor: isRestDay ? 'transparent' : 'rgba(0, 112, 243, 0.1)',
              border: isRestDay ? '1px dashed #333' : '1px solid #0070f3',
              padding: '16px 24px',
              borderRadius: '16px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.1s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <h3 style={{ margin: 0, color: isRestDay ? '#888' : '#0070f3', fontSize: '1.2rem', textTransform: 'uppercase' }}>
              {isRestDay ? 'Active Recovery' : todaysPlan.focus}
            </h3>
            {!isRestDay && todaysPlan.exercises.length > 0 && (
              <p style={{ margin: '8px 0 0 0', color: '#ccc', fontSize: '0.9rem' }}>
                {todaysPlan.exercises.join(' • ')}
              </p>
            )}
            <span style={{ fontSize: '0.75rem', color: '#0070f3', marginTop: '12px', fontWeight: 700, opacity: 0.8 }}>
              TAP TO CONFIGURE
            </span>
          </div>
        )}

        <div style={{
          backgroundColor: activeSession && isToday ? 'transparent' : '#1a1a1a',
          padding: activeSession && isToday ? '0' : '32px 24px',
          borderRadius: '24px',
          border: activeSession && isToday ? 'none' : '1px solid #333',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          {activeSession && isToday ? (
            <div style={{ width: '100%' }}>
              <Button
                variant="primary"
                style={{ width: '100%', fontSize: '1.2rem', padding: '16px' }}
                onClick={() => setIsLogModalOpen(true)}
              >
                Resume Active Workout
              </Button>
            </div>
          ) : (
            <>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{isFuture ? "Future Workout" : (isToday ? "Ready to train today?" : "Record Past Workout")}</h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', backgroundColor: '#222', borderRadius: '12px', alignSelf: 'center', marginTop: '16px', marginBottom: '8px', border: '1px solid #333' }}>
                <span style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: 600 }}>Start Time:</span>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#0070f3',
                    fontWeight: 800,
                    border: 'none',
                    fontSize: '1.2rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                />
              </div>

              <Button
                variant="primary"
                size="massive"
                fullWidth
                onClick={() => {
                  if (!isToday) {
                    if (isFuture) {
                      window.location.href = `/plan?week=${weekSundayStr}&editDay=${getGoalEngineDay(selectedDate)}`;
                    } else {
                      window.location.href = `/session/edit${dateQuery}`;
                    }
                    return;
                  }

                  // Initialize the session directly on the Home dashboard
                  let initialActivities: WeightliftingActivity[] | undefined = undefined;
                  if (todaysPlan && todaysPlan.exercises.length > 0 && !isRestDay) {
                    initialActivities = todaysPlan.exercises.map((exerciseName, index) => {
                      return {
                        id: `act_${Date.now()}_${index}`,
                        type: 'weightlifting',
                        name: exerciseName,
                        sets: [{ id: `set_${Date.now()}_${index}_0`, weight: 0, reps: 0 }]
                      } as WeightliftingActivity;
                    });
                  }
                  // Start the session entirely inline, mutating the store
                  const sessionName = isRestDay ? 'Active Recovery' : (todaysPlan?.focus || 'Workout');
                  startNewSession('user_123', 'Custom Workout', undefined, initialActivities, sessionName);

                  // Instantly open the new Log Session full-screen tracker
                  setIsLogModalOpen(true);
                }}
              >
                <span style={{ fontWeight: 800 }}>
                  {isFuture ? `Edit Upcoming ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })} Workout` : (isToday ? "Start Workout" : `Log ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })} Workout`)}
                </span>
              </Button>
            </>
          )}
        </div>

        {/* Modals */}
        <EditSessionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          todaysPlan={todaysPlan}
          isRestDay={isRestDay || false}
          onStartWorkout={(configuredActivities) => {
            const sessionName = isRestDay ? 'Active Recovery' : (todaysPlan?.focus || 'Workout');
            startNewSession('user_123', 'Custom Workout', undefined, configuredActivities, sessionName);
            setIsLogModalOpen(true); // Open the tracker immediately after configuration
          }}
        />

        <LogSessionModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
        />

        {/* Completed Daily Sessions Log */}
        {dailySessions.length > 0 && (
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#fff' }}>
              {isToday ? "Today's workouts" : `${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}'s workouts`}
            </h3>
            {dailySessions.map(session => {
              let durationMins = 0;
              if (session.endTime) {
                durationMins = Math.round((session.endTime - session.startTime - (session.totalPausedMs || 0)) / 60000);
              }

              let totalVolume = 0;
              session.activities.forEach(act => {
                if (act.type === 'weightlifting') {
                  (act as WeightliftingActivity).sets.forEach(set => {
                    totalVolume += (set.weight * set.reps);
                  });
                }
              });

              const startTimeStr = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTimeStr = session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const sessionTitle = getDynamicSessionTitle(session);

              return (
                <div key={session.id} style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.3px' }}>
                        {sessionTitle}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#888' }}>
                        Duration: {durationMins > 0 ? `${durationMins} min` : '0 min'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#0070f3', fontWeight: 600 }}>
                      {startTimeStr} - {endTimeStr}
                    </span>
                  </div>

                  {totalVolume > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#0070f3', fontWeight: 600 }}>
                      Volume: {totalVolume.toLocaleString()} lbs
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {session.activities.map(act => (
                      <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#ccc' }}>{act.name}</span>
                        {act.type === 'weightlifting' && (
                          <span style={{ color: '#666' }}>{(act as WeightliftingActivity).sets.length} sets</span>
                        )}
                      </div>
                    ))}
                    {session.activities.length === 0 && (
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>Empty Session</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </main>
  );
}
