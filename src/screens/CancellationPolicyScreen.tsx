import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

interface CancellationPolicyScreenProps {
  onBack?: () => void;
}

export const CancellationPolicyScreen: React.FC<CancellationPolicyScreenProps> = ({ onBack }) => {
  return (
    <div id="cancellation_policy_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 shrink-0 z-20 select-none">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Back to Orbit AI"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Cancellation Policy</h1>
            <p className="text-xs text-slate-500">Subscription management &amp; renewal rules</p>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8 pb-28">
          {/* Policy Overview */}
          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subscription Policy</span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Orbit Pro Cancellation Policy
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We believe in complete transparency and customer control. You are never locked into long-term commitments, and you can cancel your Orbit Pro monthly or annual subscription at any time with immediate effect on future renewals.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* Key Cancellation Terms */}
          <section className="space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Key Cancellation Terms</h3>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Cancel Anytime:</strong> You can cancel your active subscription at any moment directly through the Payment / Billing section of Orbit AI without having to call or fill out lengthy surveys.
              </li>
              <li>
                <strong>Immediate Stop on Auto-Renewal:</strong> Upon clicking cancel, auto-renewal is immediately deactivated in our billing system. Your bank card will never be billed again for future subscription periods.
              </li>
              <li>
                <strong>Keep Access Until Expiry:</strong> If you cancel outside of the 7-day refund window, you continue to receive full, uninterrupted access to Orbit Pro features (unlimited messages, Task Mode, Side Hustle Generator, and Agent tools) until the end of your current paid monthly or annual billing period.
              </li>
              <li>
                <strong>Free Tier Transition &amp; Data Safety:</strong> When your paid period ends, your account smoothly transitions to the permanent Free Tier. We never delete your saved chat history, generated CVs, or business plans. You can re-upgrade anytime in the future.
              </li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* Refund Window Distinction */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Cancellations Within 7 Days (Full Refund)</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              If you cancel within <strong>7 calendar days</strong> of your initial purchase or subscription charge, you are entitled to a 100% full refund under our 7-Day Money-Back Guarantee. Please refer to our <strong>Refund Policy</strong> for simple refund processing instructions.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* Step-by-Step Cancellation Guide */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">How to Cancel Your Subscription</h3>
            <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <li>Open the Orbit AI menu in the upper corner of the chat screen.</li>
              <li>Select <strong>Payment / Billing</strong>.</li>
              <li>Under your active subscription card, tap <strong>Cancel Subscription</strong>.</li>
              <li>Confirm cancellation. Your status updates immediately to canceled with your expiry date displayed.</li>
            </ol>
            <p className="text-xs text-slate-500 pt-2">
              Alternatively, you can email our support team at <strong className="text-slate-700">ndamulelomakushu63@gmail.com</strong> with your registered account email and we will gladly process cancellation on your behalf.
            </p>
          </section>

          {/* Footer Info */}
          <footer className="text-xs text-slate-400 pt-4 border-t border-slate-100 space-y-1">
            <p>&copy; 2026 Orbit AI. Built for South African productivity &amp; innovation.</p>
            <p>Designed and founded by Ndamulelo Makushu Glen.</p>
          </footer>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};
