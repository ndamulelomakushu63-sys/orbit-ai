import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

interface TermsScreenProps {
  onBack?: () => void;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({ onBack }) => {
  return (
    <div id="terms_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
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
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Terms of Service</h1>
            <p className="text-xs text-slate-500">Effective: October 2026</p>
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legal Agreement</span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Terms &amp; Conditions of Use
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Welcome to Orbit AI ("the Platform"). By accessing or using our website, AI chat interface, Task Mode utilities, and marketplace services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* 1. Eligibility & Accounts */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">1. Eligibility &amp; Account Responsibility</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
              <li>You must be at least 13 years of age (or the minimum legal age in your jurisdiction) to use Orbit AI.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials and are fully accountable for all activities that take place under your account.</li>
              <li>You agree to provide accurate, current, and truthful information during registration.</li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* 2. Acceptable Use Policy */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">2. Acceptable Use Policy</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Orbit AI provides AI-assisted content creation and business utilities for constructive, lawful purposes. You strictly agree NOT to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <li>Use the Platform to generate fraudulent, harassing, defamatory, or unlawful materials.</li>
              <li>Attempt to reverse-engineer, decompile, scrape, or extract source code or underlying AI models without express permission.</li>
              <li>Upload malicious code, viruses, or exploit vulnerabilities in our edge routing infrastructure.</li>
              <li>Falsely claim endorsement or affiliation with Orbit AI without written authorization.</li>
              <li>Engage in automated or abusive request spam that degrades platform availability for other users.</li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* 3. AI Generated Content Disclaimer */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">3. Artificial Intelligence Disclaimer</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Orbit AI utilizes probabilistic large language inference models to assist with research, draft preparation, and ideation. While we strive for high precision, AI models may occasionally produce incomplete, inaccurate, or outdated outputs. Orbit AI does NOT provide certified legal, medical, or registered financial advisory services. You must verify and review all generated CVs, business proposals, and legal document templates before relying on them for commercial or statutory decisions.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* 4. Subscriptions, Payments & Cancellations */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">4. Subscriptions, Payments &amp; Cancellations</h3>
            <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Orbit Pro subscriptions provide enhanced capabilities including unlimited messaging, task automations, and agent tools. All payments are billed securely via registered payment gateways.
              </p>
              <p>
                <strong>Cancellation:</strong> You may cancel your subscription auto-renewal at any time through the Billing portal. Auto-renewal stops immediately upon confirmation.
              </p>
              <p>
                <strong>Refunds:</strong> Full refunds are provided for cancellations submitted within 7 calendar days of the initial billing date, as detailed in our <strong>Refund Policy</strong>.
              </p>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* 5. Intellectual Property Rights */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">5. Intellectual Property Rights</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              As between you and Orbit AI, you retain full ownership of the prompts and raw content you submit. You also own the output text generated for your specific prompts, subject to your compliance with these Terms. The Orbit AI brand name, logos, UI designs, code architecture, and documentation remain the exclusive intellectual property of Ndamulelo Makushu Glen.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* 6. Governing Law & Jurisdiction */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">6. Governing Law &amp; Jurisdiction</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              These Terms of Service are governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Johannesburg, Gauteng.
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
