"use client";

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/lib/store';
import { OnboardingModal } from './OnboardingModal';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
    const { initializeAuth, isAuthenticated, userProfile } = useSessionStore();
    const initRef = useRef(false);

    useEffect(() => {
        // Strict mode deduplication
        if (!initRef.current) {
            initRef.current = true;
            initializeAuth();
        }
    }, [initializeAuth]);

    const needsOnboarding = isAuthenticated && userProfile && !userProfile.is_onboarded;

    return (
        <>
            {children}
            {needsOnboarding && <OnboardingModal />}
        </>
    );
}
