"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, User, CalendarDays } from 'lucide-react';
import styles from './NavBar.module.css';

export const NavBar = () => {
    const pathname = usePathname();

    const navItems = [
        { path: '/', icon: <Home size={28} />, label: 'Workout' },
        { path: '/plan', icon: <CalendarDays size={28} />, label: 'Plan' },
        { path: '/history', icon: <History size={28} />, label: 'History' },
        { path: '/profile', icon: <User size={28} />, label: 'Profile' },
    ];

    return (
        <nav className={styles.navBar}>
            {navItems.map(item => (
                <Link
                    key={item.path}
                    href={item.path}
                    className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
                >
                    {item.icon}
                    <span className={styles.label}>{item.label}</span>
                </Link>
            ))}
        </nav>
    );
};
