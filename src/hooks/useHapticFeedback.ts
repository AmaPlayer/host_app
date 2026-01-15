import { useCallback } from 'react';

/**
 * Hook to trigger haptic feedback (vibration) on supported devices.
 * Provides distinct patterns for different interaction types.
 */
export const useHapticFeedback = () => {
    // Check if vibration is supported
    const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    /**
     * Light impact - for standard button taps, toggles
     * Duration: 10ms
     */
    const light = useCallback(() => {
        if (isSupported) {
            navigator.vibrate(10);
        }
    }, [isSupported]);

    /**
     * Medium impact - for significant actions like Like, Follow
     * Duration: 20ms
     */
    const medium = useCallback(() => {
        if (isSupported) {
            navigator.vibrate(20);
        }
    }, [isSupported]);

    /**
     * Heavy impact - for destructive actions or success completion
     * Duration: 40ms
     */
    const heavy = useCallback(() => {
        if (isSupported) {
            navigator.vibrate(40);
        }
    }, [isSupported]);

    /**
     * Success pattern - two quick pulses
     */
    const success = useCallback(() => {
        if (isSupported) {
            navigator.vibrate([10, 30, 20]);
        }
    }, [isSupported]);

    /**
     * Error pattern - three quick pulses
     */
    const error = useCallback(() => {
        if (isSupported) {
            navigator.vibrate([10, 20, 10, 20, 50]);
        }
    }, [isSupported]);

    return {
        isSupported,
        light,
        medium,
        heavy,
        success,
        error
    };
};

export default useHapticFeedback;
