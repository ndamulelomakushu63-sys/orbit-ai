import React, { useEffect } from 'react';
import { AppStateProvider } from './services/state';
import { MarketProvider } from './services/marketState';
import { AppNavigator } from './navigation/AppNavigator';

export default function App() {
  return (
    <AppStateProvider>
      <MarketProvider>
        <AppContent />
      </MarketProvider>
    </AppStateProvider>
  );
}

function AppContent() {
  useEffect(() => {
    // Permanent fix for mobile keyboard viewport resize & whitespace bug on Android and iOS
    const resetWindowScroll = () => {
      if (window.scrollY !== 0 || document.body.scrollTop !== 0 || document.documentElement.scrollTop !== 0) {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
      }
    };

    const updateAppHeight = () => {
      resetWindowScroll();
      const vv = window.visualViewport;
      const currentHeight = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${currentHeight}px`);
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        resetWindowScroll();
        requestAnimationFrame(resetWindowScroll);
        setTimeout(updateAppHeight, 50);
        setTimeout(updateAppHeight, 150);
        setTimeout(updateAppHeight, 300);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setTimeout(updateAppHeight, 100);
      }
    };

    window.addEventListener('resize', updateAppHeight);
    window.addEventListener('orientationchange', updateAppHeight);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('focusin', handleFocusIn);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateAppHeight);
      window.visualViewport.addEventListener('scroll', updateAppHeight);
    }

    updateAppHeight();

    return () => {
      window.removeEventListener('resize', updateAppHeight);
      window.removeEventListener('orientationchange', updateAppHeight);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('focusin', handleFocusIn);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateAppHeight);
        window.visualViewport.removeEventListener('scroll', updateAppHeight);
      }
    };
  }, []);

  return (
    <div 
      className="w-full bg-white text-slate-800 flex flex-col font-sans overflow-hidden"
      style={{ height: 'var(--app-height, 100vh)', minHeight: 'var(--app-height, 100vh)' }}
    >
      <AppNavigator />
    </div>
  );
}
