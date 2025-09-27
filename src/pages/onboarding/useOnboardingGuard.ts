import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useOnboardingGuard() {
  const location = useLocation();

  useEffect(() => {
    // Prevent browser back button from escaping onboarding
    const handlePopstate = (event: PopStateEvent) => {
      if (location.pathname.startsWith('/onboarding/')) {
        // Stay on current onboarding step
        window.history.pushState(null, '', location.pathname);
      }
    };

    // Add popstate listener
    window.addEventListener('popstate', handlePopstate);

    // Push current state to prevent going back immediately
    if (location.pathname.startsWith('/onboarding/')) {
      window.history.pushState(null, '', location.pathname);
    }

    // Show confirmation dialog on page reload/close attempt
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (location.pathname.startsWith('/onboarding/')) {
        event.preventDefault();
        event.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname]);
}

// Check if user should see onboarding
export function shouldShowOnboarding(): boolean {
  // Always show if in dev mode
  if (import.meta.env.DEV) return true;
  
  // Show if forced via URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tutorial') === 'force') return true;
  if (localStorage.getItem('forceTutorial') === '1') return true;
  
  // Show if not completed yet
  return localStorage.getItem('onboardingCompleted') !== 'true';
}