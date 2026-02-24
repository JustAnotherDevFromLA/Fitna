"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { useSessionStore } from '../lib/store';
import { WeeklyCalendar } from '../components/ui/WeeklyCalendar';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { GoalEngine, SplitType, SessionPlan } from '../lib/GoalEngine';

export default function Home() {
  const { activeSession } = useSessionStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeSplit, setActiveSplit] = useState<SplitType | null>(null);

  useEffect(() => {
    // Only access localStorage on client mount
    const stored = localStorage.getItem('activeSplit') as SplitType | null;
    if (stored) setActiveSplit(stored);
  }, []);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateQuery = `?date=${selectedDate.toISOString().split('T')[0]}`;

  // JS getDay() is 0 (Sunday) to 6 (Saturday). 
  // Our GoalEngine uses Day 1 to Day 7. Let's map Sunday=7, Monday=1...Saturday=6
  const getGoalEngineDay = (d: Date) => {
    const jsDay = d.getDay();
    return jsDay === 0 ? 7 : jsDay;
  };

  let todaysPlan: SessionPlan | null = null;
  if (activeSplit) {
    const routines = GoalEngine.generateSessionsForSplit(activeSplit);
    const targetDay = getGoalEngineDay(selectedDate);
    todaysPlan = routines.find(r => r.day === targetDay) || null;
  }

  const isRestDay = todaysPlan?.focus.toLowerCase().includes('rest');

  return (
    <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center', maxWidth: '600px', margin: '0 auto' }}>

      {/* Dynamic Weekly Calendar */}
      <WeeklyCalendar
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate(d)}
      />

      {/* Main Call to Action */}
      <div style={{ width: '100%', marginTop: '8px' }}>
        <h2 style={{ marginBottom: '16px' }}>{isToday ? "Today's Plan" : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h2>

        {/* Weekly Split Focus Card */}
        {todaysPlan && (
          <div style={{
            backgroundColor: isRestDay ? 'transparent' : 'rgba(0, 112, 243, 0.1)',
            border: isRestDay ? '1px dashed #333' : '1px solid #0070f3',
            padding: '16px 24px',
            borderRadius: '16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, color: isRestDay ? '#888' : '#0070f3', fontSize: '1.2rem', textTransform: 'uppercase' }}>
              {isRestDay ? 'Active Recovery' : todaysPlan.focus}
            </h3>
            {!isRestDay && todaysPlan.exercises.length > 0 && (
              <p style={{ margin: '8px 0 0 0', color: '#ccc', fontSize: '0.9rem' }}>
                {todaysPlan.exercises.join(' • ')}
              </p>
            )}
          </div>
        )}

        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '32px 24px',
          borderRadius: '24px',
          border: '1px solid #333',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          {activeSession && isToday ? (
            <>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#0070f3' }}>Session in Progress</h3>
              <p style={{ color: '#aaa', margin: 0 }}>You have an active workout. Jump back in.</p>
              <Link href="/session/edit" style={{ width: '100%', textDecoration: 'none' }}>
                <Button variant="primary" size="massive" fullWidth>
                  <Play fill="currentColor" size={24} style={{ marginRight: '8px' }} /> Resume Workout
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{isToday ? "Ready to train?" : "Record Past Workout"}</h3>
              <p style={{ color: '#aaa', margin: 0 }}>Start a new session or build your workout from scratch.</p>
              <Link href={`/session/edit${dateQuery}`} style={{ width: '100%', textDecoration: 'none' }}>
                <Button variant="primary" size="massive" fullWidth>
                  Log Workout for {isToday ? "Today" : selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

    </main>
  );
}
