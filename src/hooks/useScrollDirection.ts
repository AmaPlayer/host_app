import { useState, useEffect } from 'react';

export function useScrollDirection() {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const controlNavbar = () => {
            const currentScrollY = window.scrollY;
            // console.log('Scroll:', currentScrollY, 'Last:', lastScrollY, 'Visible:', isVisible); // Debug log

            // Always show at the top or if scrolling up
            if (currentScrollY < 50 || currentScrollY < lastScrollY) {
                if (!isVisible) setIsVisible(true); // Only set if changed
            } else if (currentScrollY > 50 && currentScrollY > lastScrollY) {
                // Hide only if we've scrolled down past the threshold AND are scrolling down
                if (isVisible) setIsVisible(false); // Only set if changed
            }

            setLastScrollY(currentScrollY);
        };

        // Throttle the scroll event listener
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    controlNavbar();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    }, [lastScrollY]);

    return isVisible;
}
