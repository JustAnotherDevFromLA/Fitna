import React from 'react';

interface WeeklyCalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ selectedDate, onSelectDate }) => {
    // Generate dates for the current week based on the selectedDate (Sunday to Saturday)
    const currentDayOfWeek = selectedDate.getDay(); // 0 (Sun) to 6 (Sat)

    // Find the Sunday of the selected week
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - currentDayOfWeek);

    // Normalize time to midnight for simple date comparisons
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const normalizedSelected = normalizeDate(selectedDate);
    const today = normalizeDate(new Date());

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
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
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: '#1a1a1a',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #333',
            width: '100%'
        }}>
            {weekDays.map((day, idx) => (
                <button
                    key={idx}
                    onClick={() => onSelectDate(day.dateObj)}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        backgroundColor: day.isSelected ? 'rgba(0, 112, 243, 0.15)' : 'transparent',
                        border: day.isSelected ? '1px solid #0070f3' : (day.isToday ? '1px solid #333' : '1px solid transparent'),
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                    }}
                >
                    <span style={{
                        fontSize: '0.75rem',
                        color: day.isSelected ? '#0070f3' : (day.isToday ? '#fff' : '#888'),
                        textTransform: 'uppercase',
                        fontWeight: day.isSelected || day.isToday ? 700 : 500,
                        marginBottom: '4px'
                    }}>
                        {day.dayName}
                    </span>
                    <span style={{
                        fontSize: '1.2rem',
                        fontWeight: day.isSelected || day.isToday ? 800 : 600,
                        color: day.isSelected || day.isToday ? '#fff' : '#ccc'
                    }}>
                        {day.dayNumber}
                    </span>
                </button>
            ))}
        </div>
    );
};
