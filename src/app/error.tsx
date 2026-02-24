"use client";

import { useEffect } from 'react';
import { Button } from '../components/ui/Button';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '24px',
            textAlign: 'center',
            color: 'white'
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid #ff4d4f',
                maxWidth: '400px'
            }}>
                <h2 style={{ color: '#ff4d4f', marginTop: 0 }}>Something went wrong!</h2>
                <p style={{ color: '#aaa', margin: '16px 0 24px 0' }}>
                    An unexpected error occurred in the Antigravity engine. Don't worry, your offline data is safe.
                </p>
                <Button
                    variant="secondary"
                    size="large"
                    fullWidth
                    onClick={() => reset()}
                >
                    Try again
                </Button>
            </div>
        </div>
    );
}
