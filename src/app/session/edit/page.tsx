"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SessionLogEditor } from '../../../components/session/SessionLogEditor';

function SessionEditForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const sessionId = searchParams.get('sessionId');
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');
    const exercisesParam = searchParams.get('exercises');
    const nameParam = searchParams.get('name');

    return (
        <main style={{ padding: '24px' }}>
            <SessionLogEditor
                sessionId={sessionId}
                dateParam={dateParam}
                timeParam={timeParam}
                exercisesParam={exercisesParam}
                nameParam={nameParam}
                onComplete={() => router.push('/history')}
                onDelete={() => router.push('/history')}
            />
        </main>
    );
}

export default function SessionEditPage() {
    return (
        <Suspense fallback={<div style={{ color: 'var(--foreground)', padding: '24px' }}>Loading Editor...</div>}>
            <SessionEditForm />
        </Suspense>
    );
}
