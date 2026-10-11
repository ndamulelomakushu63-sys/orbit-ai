import React, { useEffect, useState, useRef } from 'react';
import { useAppState } from '../services/state';

interface GoogleAdSenseUnitProps {
  /** True only when genuine publisher content has finished loading */
  hasContentReady: boolean;
  /** True if any modal is currently active */
  isModalActive?: boolean;
  /** Optional specific ad slot ID if configured in Google AdSense */
  adSlot?: string;
  /** Custom CSS class names */
  className?: string;
}

const ADSENSE_CLIENT_ID = "ca-pub-4390078695601187";

// Public, content-rich screens verified compliant with Google Publisher Policies
// NEVER allow ads on reward screens, private chat, login/register, splash, or transactional pages
const ALLOWED_ADSENSE_SCREENS = ['about'];

/**
 * Dedicated, Policy-Compliant Google AdSense Placement Component
 *
 * Strict Google AdSense Policy Enforcement:
 * 1. ONLY renders on verified public, content-rich informational screens ('about')
 * 2. NEVER renders on Orbit Rewards, Chat, Login, Register, Splash, or payment/error screens
 * 3. ONLY requests ads after publisher content is confirmed present in the DOM (> 500 characters)
 * 4. NEVER renders during loading states, errors, or when any modal/dialog is active
 * 5. Positioned inline within publisher editorial content with clear "ADVERTISEMENT" labeling
 * 6. Kept well away from interactive buttons or controls to prevent accidental clicks
 * 7. Unmounts cleanly when navigating away
 */
export const GoogleAdSenseUnit: React.FC<GoogleAdSenseUnitProps> = ({
  hasContentReady,
  isModalActive = false,
  adSlot,
  className = ""
}) => {
  const { mobileScreen } = useAppState();
  const [adEligible, setAdEligible] = useState<boolean>(false);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const adContainerRef = useRef<HTMLDivElement | null>(null);
  const adInitializedRef = useRef<boolean>(false);

  // 1. Verify all policy safety conditions before enabling the ad
  useEffect(() => {
    // Condition 1: Must strictly be on an allowed, content-rich public screen
    if (!ALLOWED_ADSENSE_SCREENS.includes(mobileScreen)) {
      setAdEligible(false);
      adInitializedRef.current = false;
      return;
    }

    // Condition 2: Must not be loading and must not have an active modal/popup
    if (!hasContentReady || isModalActive) {
      setAdEligible(false);
      adInitializedRef.current = false;
      return;
    }

    // Condition 3: Check that genuine publisher content is actually rendered in the DOM
    const timer = setTimeout(() => {
      const contentEl = document.getElementById('about-publisher-content');
      const textLength = contentEl ? (contentEl.textContent || '').trim().length : 0;

      // Meaningful publisher content requirement (> 500 characters of genuine content)
      if (contentEl && textLength > 500 && ALLOWED_ADSENSE_SCREENS.includes(mobileScreen)) {
        setAdEligible(true);
      } else {
        setAdEligible(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [mobileScreen, hasContentReady, isModalActive]);

  // 2. Load the official Google AdSense library dynamically only when verified eligible
  useEffect(() => {
    if (!adEligible) return;

    // Check if script is already present
    const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    // Inject AdSense script dynamically
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.warn("[AdSense] Failed to load adsbygoogle script.");
    };

    document.head.appendChild(script);
  }, [adEligible]);

  // 3. Initialize the AdSense unit once script is ready and DOM element is mounted
  useEffect(() => {
    if (!adEligible || !scriptLoaded || adInitializedRef.current) return;

    const pushTimer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && adContainerRef.current) {
          const rect = adContainerRef.current.getBoundingClientRect();
          if (rect.width > 0) {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            adInitializedRef.current = true;
          }
        }
      } catch (err) {
        console.warn("[AdSense] Push notification error or ad-blocker active:", err);
      }
    }, 300);

    return () => {
      clearTimeout(pushTimer);
    };
  }, [adEligible, scriptLoaded]);

  // If not eligible according to policy, render nothing
  if (!adEligible || !ALLOWED_ADSENSE_SCREENS.includes(mobileScreen) || isModalActive) {
    return null;
  }

  return (
    <div 
      ref={adContainerRef}
      className={`w-full my-8 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 shadow-2xs transition-all overflow-hidden ${className}`}
    >
      {/* Google AdSense Compliant Label */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          Advertisement
        </span>
        <span className="text-[10px] text-slate-400">
          Google Publisher Network
        </span>
      </div>

      {/* Ad Placement Container - Responsive, Content-Rich Editorial Context */}
      <div className="w-full flex items-center justify-center min-h-[100px] sm:min-h-[120px] bg-white rounded-xl overflow-hidden border border-slate-100">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '90px' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          {...(adSlot ? { 'data-ad-slot': adSlot } : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' })}
        />
      </div>

      {/* Compliance & Privacy Notice */}
      <div className="pt-2 mt-3 border-t border-slate-200/60 text-center">
        <p className="text-[10px] text-slate-400 leading-tight">
          Advertisements support Orbit AI. Compliant with Google Publisher Policies &amp; POPIA.
        </p>
      </div>
    </div>
  );
};
