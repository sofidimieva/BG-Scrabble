import { useEffect, useRef, useCallback, useState } from 'react';
import { TIMER_SECONDS } from '../constants';

export function useTimer(
    onMyTimeUp: () => void,
    onOpponentTimeUp: () => void,
    isMyTurn: boolean,
    customSeconds?: number
) {
    const initialTime = customSeconds || TIMER_SECONDS;
    const [myTimeLeft, setMyTimeLeft] = useState(initialTime);
    const [opponentTimeLeft, setOpponentTimeLeft] = useState(initialTime);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onMyTimeUpRef = useRef(onMyTimeUp);
    const onOpponentTimeUpRef = useRef(onOpponentTimeUp);
    const isMyTurnRef = useRef(isMyTurn);
    const initialTimeRef = useRef(initialTime);

    onMyTimeUpRef.current = onMyTimeUp;
    onOpponentTimeUpRef.current = onOpponentTimeUp;
    isMyTurnRef.current = isMyTurn;

    // Update initial time if custom seconds change
    useEffect(() => {
        initialTimeRef.current = customSeconds || TIMER_SECONDS;
        setMyTimeLeft(customSeconds || TIMER_SECONDS);
        setOpponentTimeLeft(customSeconds || TIMER_SECONDS);
    }, [customSeconds]);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            if (isMyTurnRef.current) {
                // Count down my time
                setMyTimeLeft((prev) => {
                    if (prev <= 1) {
                        onMyTimeUpRef.current();
                        return 0;
                    }
                    return prev - 1;
                });
            } else {
                // Count down opponent's time
                setOpponentTimeLeft((prev) => {
                    if (prev <= 1) {
                        onOpponentTimeUpRef.current();
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const resetMyTimer = useCallback(() => {
        setMyTimeLeft(initialTimeRef.current);
    }, []);

    const resetOpponentTimer = useCallback(() => {
        setOpponentTimeLeft(initialTimeRef.current);
    }, []);

    const setOpponentTime = useCallback((seconds: number) => {
        setOpponentTimeLeft(seconds);
    }, []);

    const formatTime = useCallback((secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, []);

    return {
        myTimeLeft,
        opponentTimeLeft,
        resetMyTimer,
        resetOpponentTimer,
        setOpponentTime,
        formatTime,
    };
}
