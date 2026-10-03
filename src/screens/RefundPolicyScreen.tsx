import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

interface RefundPolicyScreenProps {
  onBack?: () => void;
}

export const RefundPolicyScreen: React.FC<RefundPolicyScreenProps> = ({ onBack }) => {
  return (
    <div id="refund_policy_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
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
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Refund Policy</h1>
            <p className="text-xs text-slate-500">Transparent billing &amp; customer guarantees</p>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8 pb-28">
          {/* Overview */}
          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customer Guarantee</span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Our 7-Day Money-Back Guarantee
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              At Orbit AI, we stand behind the quality and practical utility of our tools. If you upgrade to an <strong>Orbit Pro</strong> monthly or yearly plan and decide it is not the right fit for your productivity needs, we provide a full, unconditional refund within the first 7 days.
            </p>

            <div className="pt-2 text-xs sm:text-sm text-slate-600 space-y-1.5">
              <div><strong>Refund Window:</strong> 7 calendar days from initial charge date.</div>
              <div><strong>Refund Amount:</strong> 100% full refund with no hidden processing deductions.</div>
              <div><strong>Turnaround:</strong> 5–10 business days directly to original payment method.</div>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* How to Request a Refund */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">How to Request a Refund</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Submitting a refund request is straightforward. Simply send an email to our billing operations desk:
            </p>
            <div className="text-xs sm:text-sm text-slate-700 space-y-1">
              <div><strong>Billing Operations Email:</strong> ndamulelomakushu63@gmail.com</div>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                Include your registered Orbit AI account email address and your transaction reference (found in your confirmation email). Our team will process your refund without complicated requirements.
              </p>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Subscription Cancellation Terms */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Subscription Cancellation Terms</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              You can cancel the auto-renewal of your subscription at any time. Cancellation takes effect immediately for future billing cycles:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Retain Pre-paid Access:</strong> When you cancel a subscription outside of the 7-day refund window, you will continue to enjoy unlimited Orbit Pro benefits until your current paid month or year concludes.
              </li>
              <li>
                <strong>No Automatic Re-billing:</strong> Your payment method will not be debited again once cancellation is confirmed in your Payments portal.
              </li>
              <li>
                <strong>Free Tier Preservation:</strong> Following the conclusion of your Pro cycle, your account remains active on the complimentary Free Tier, ensuring all your saved conversations and CVs remain accessible.
              </li>
            </ul>
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
