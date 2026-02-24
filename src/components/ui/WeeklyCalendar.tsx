import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeeklyCalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ selectedDate, onSelectDate }) => {
    // Normalize time to midnight for simple date comparisons
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // Compute the Sunday of any given date
    const getSunday = (date: Date) => {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        return normalizeDate(d);
    };

    // The calendar's internal state: which week is currently being viewed
    const [viewedWeekSunday, setViewedWeekSunday] = useState<Date>(getSunday(selectedDate));

    // Optional: if external selectedDate jumps drastically (e.g. they pick a day from a month view), 
    // you might want to auto-snap the viewed week to match. For now, it respects manual swiping.
    const normalizedSelected = normalizeDate(selectedDate);
    const today = normalizeDate(new Date());

    const isCurrentWeek = viewedWeekSunday.getTime() === getSunday(today).getTime();

    const handlePrevWeek = () => {
        const prev = new Date(viewedWeekSunday);
        prev.setDate(prev.getDate() - 7);
        setViewedWeekSunday(prev);
    };

    const handleNextWeek = () => {
        const next = new Date(viewedWeekSunday);
        next.setDate(next.getDate() + 7);
        setViewedWeekSunday(next);
    };

    const handleJumpToPresent = () => {
        setViewedWeekSunday(getSunday(today));
        onSelectDate(today);
    };

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(viewedWeekSunday);
        d.setDate(viewedWeekSunday.getDate() + i);
        const normalizedD = normalizeDate(d);

        return {
            dateObj: d,
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNumber: d.getDate(),
            isSelected: normalizedD.getTime() === normalizedSelected.getTime(),
            isToday: normalizedD.getTime() === today.getTime()
        };
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Header controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', height: '32px' }}>
                <button onClick={handlePrevWeek} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                    <ChevronLeft size={24} />
                </button>

                <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700 }}>
                    {viewedWeekSunday.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isCurrentWeek && (
                        <button
                            onClick={handleJumpToPresent}
                            style={{ background: 'rgba(0,112,243,0.1)', color: '#0070f3', border: '1px solid rgba(0,112,243,0.2)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Present
                        </button>
                    )}
                    <button onClick={handleNextWeek} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            {/* Scrollable Container Container */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                backgroundColor: '#1a1a1a',
                padding: '16px 10px',
                borderRadius: '16px',
                border: '1px solid #333',
                width: '100%',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none',  /* IE 10+ */
            }}>
                {/* Hide scrollbar for Chrome/Safari/Webkit via external CSS or simple inline trick (harder inline) */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    div::-webkit-scrollbar { display: none; }
                `}} />

                {weekDays.map((day, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectDate(day.dateObj)}
                        style={{
                            scrollSnapAlign: 'start',
                            flex: '0 0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 6px',
                            minWidth: '13%', // Ensure they fit in the constrained box
                            borderRadius: '12px',
                            backgroundColor: day.isSelected ? 'rgba(0, 112, 243, 0.15)' : 'transparent',
                            border: day.isSelected ? '1px solid #0070f3' : (day.isToday ? '1px solid #333' : '1px solid transparent'),
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                            position: 'relative' // For the today dot
                        }}
                    >
                        <span style={{
                            fontSize: '0.9rem',
                            color: day.isSelected ? '#0070f3' : (day.isToday ? '#fff' : '#888'),
                            textTransform: 'uppercase',
                            fontWeight: day.isSelected || day.isToday ? 700 : 500,
                            marginBottom: '2px'
                        }}>
                            {day.dayName}
                        </span>
                        <span style={{
                            fontSize: '1.4rem',
                            fontWeight: day.isSelected || day.isToday ? 800 : 600,
                            color: day.isSelected || day.isToday ? '#fff' : '#ccc'
                        }}>
                            {day.dayNumber}
                        </span>
                        {/* Subtle dot indicator if it's the actual current day but NOT selected */}
                        {day.isToday && !day.isSelected && (
                            <div style={{
                                position: 'absolute',
                                bottom: '5px',
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: '#fff'
                            }} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
