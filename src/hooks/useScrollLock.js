import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal/overlay is active
 * @param {boolean} isLocked - Whether the scroll should be locked
 */
export const useScrollLock = (isLocked) => {
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const originalStyle = window.getComputedStyle(document.body).overflow;
        const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;

        if (isLocked) {
            // Prevent scroll
            document.body.style.overflow = 'hidden';
            
            // Optional: Handle scrollbar jump if needed
            // const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            // if (scrollBarWidth > 0) {
            //     document.body.style.paddingRight = `${scrollBarWidth}px`;
            // }
        }

        return () => {
            document.body.style.overflow = originalStyle;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [isLocked]);
};

export default useScrollLock;
