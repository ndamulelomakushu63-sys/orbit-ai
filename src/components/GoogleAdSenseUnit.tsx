import React, { useEffect, useState, useRef } from 'react';
import { useAppState } from '../services/state';

interface GoogleAdSenseUnitProps {
  /** True only when Orbit Rewards data and publisher content have finished loading */
  hasContentReady: boolean;
  /** True if any modal (such as EFT withdrawal modal or session modal) is currently active */
  isModalActive?: boolean;
  /** Optional specific ad slot ID if configured in Google AdSense */
  adSlot?: string;
  /** Custom CSS class names */
  className?: string;
}

const ADSENSE_CLIENT_ID = "ca-pub-4390078695601187";

/**
 * Dedicated, Policy-Compliant Google AdSense Placement Component
 *
 * Strict Google AdSense Policy Enforcement:
 * 1. ONLY renders when mobileScreen === 'orbit-rewards'
 * 2. ONLY requests ads after the Orbit Rewards screen has fully loaded
 * 3. ONLY requests ads when meaningful publisher content is confirmed present in the DOM
 * 4. NEVER renders on blank screens, loading states, error states, popups, or modals
 * 5. Positioned inline within publisher content with clear "SPONSORED ADVERTISEMENT" labeling
 * 6. Never replaces or covers any buttons, text, or navigation
 * 7. Unmounts cleanly when navigating away from Orbit Rewards
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
    // Condition 1: Must strictly be on the Orbit Rewards screen
    if (mobileScreen !== 'orbit-rewards') {
      setAdEligible(false);
      adInitializedRef.current = false;
      return;
    }

    // Condition 2 & 4: Must not be loading and must not have an active modal/popup
    if (!hasContentReady || isModalActive) {
      setAdEligible(false);
      adInitializedRef.current = false;
      return;
    }

    // Condition 3 & 7: Check that genuine publisher content has actually rendered in the DOM
    // Delay slightly to ensure full layout stabilization
    const timer = setTimeout(() => {
      const contentEl = document.getElementById('orbit-rewards-publisher-content');
      const textLength = contentEl ? (contentEl.textContent || '').trim().length : 0;

      // Meaningful publisher content requirement (> 250 characters of genuine content)
      if (contentEl && textLength > 250) {
        setAdEligible(true);
      } else {
        setAdEligible(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [mobileScreen, hasContentReady, isModalActive]);

  // 2. Load the official Google AdSense library dynamically only when eligible
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
          // Check if the ad container is visible and has width
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
  if (!adEligible || mobileScreen !== 'orbit-rewards' || isModalActive) {
    return null;
  }

  return (
    <div 
      ref={adContainerRef}
      className={`w-full my-6 p-3 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs transition-all overflow-hidden ${className}`}
    >
      {/* Google AdSense Compliant Label */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          Sponsored Advertisement
        </span>
        <span className="text-[10px] text-slate-400">
          Google AdSense Verified Partner
        </span>
      </div>

      {/* Ad Placement Container - Responsive & Non-Intrusive */}
      <div className="w-full flex items-center justify-center min-h-[100px] sm:min-h-[120px] bg-slate-50/50 rounded-xl overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '90px' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          {...(adSlot ? { 'data-ad-slot': adSlot } : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' })}
        />
      </div>

      {/* Compliance & Privacy Footer Notice */}
      <div className="pt-2 mt-2 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400 leading-tight">
          Ads served support the Orbit Rewards ecosystem. Compliant with Google Publisher Policies &amp; POPIA.
        </p>
      </div>
    </div>
  );
};
