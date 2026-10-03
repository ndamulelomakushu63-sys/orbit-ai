import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

interface PrivacyPolicyScreenProps {
  onBack?: () => void;
}

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onBack }) => {
  return (
    <div id="privacy_policy_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
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
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Last updated: October 2026</p>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8 pb-28">
          {/* Intro Notice */}
          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Data Protection</span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Privacy Policy &amp; Data Protection Notice
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Orbit AI ("we", "us", or "our"), operated by Ndamulelo Makushu Glen in the Republic of South Africa, is committed to safeguarding your personal data and digital privacy. This comprehensive privacy notice explains what information we collect, why we collect it, how third-party services (including Google advertising networks) handle device identifiers, and your statutory rights under the <strong>Protection of Personal Information Act (POPIA)</strong>, Act No. 4 of 2013, as well as applicable international privacy standards.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* 1. Personal Information We Collect */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">1. Personal Information We Collect</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We collect information that you directly provide when registering an account, interacting with our AI conversational assistant, or transacting within the Orbit ecosystem:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Account Credentials:</strong> Full name, verified mobile phone number, email address, and encrypted password authentication data managed via Supabase Auth.
              </li>
              <li>
                <strong>Conversations &amp; User Prompts:</strong> Text prompts and queries submitted to our AI assistant to fulfill research, drafting, translation, and task-generation workflows.
              </li>
              <li>
                <strong>Multimodal Uploads:</strong> Photos, document scans, or files captured via camera or file picker, processed securely in memory to extract text and analyze context.
              </li>
              <li>
                <strong>Transaction &amp; Subscription Records:</strong> Payment gateway identifiers, plan tiers (Free vs. Pro), and receipt tokens. We never store raw credit card numbers or banking CVVs on our servers.
              </li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* 2. Google Advertising, Cookies & Tracking Technologies */}
          <section className="space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">2. Google Advertising, Cookies &amp; Tracking Technologies</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Orbit AI partners with third-party vendors, including <strong>Google AdSense</strong> and Google advertising services, to serve advertisements when you visit our website:
            </p>
            
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <h4 className="font-semibold text-slate-800">Google AdSense Disclosures</h4>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Third-party vendors, including Google, use cookies and web beacons to serve ads based on a user's prior visits to Orbit AI or other websites on the Internet.</li>
                <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.</li>
                <li>Users may opt out of personalized advertising by visiting Google's <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Ads Settings</a>. Alternatively, users can opt out of third-party vendors' use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">aboutads.info</a>.</li>
              </ul>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed pt-2">
              <h4 className="font-semibold text-slate-800">Cookies Used by Orbit AI</h4>
              <p>We use essential cookies strictly necessary for session persistence, authentication tokens, and user preferences (such as active chat conversation IDs). We do not sell your personal data to data brokers or unrelated third parties.</p>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* 3. Purpose & Legal Basis */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">3. Purpose and Legal Basis of Processing (POPIA Compliance)</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Under South Africa's POPIA legislation, we process your personal information only when lawful conditions are met:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <li><strong>Performance of Contract:</strong> Providing AI conversational responses, rendering generated CVs and documents, and maintaining your subscription account.</li>
              <li><strong>Consent:</strong> When you voluntarily upload images or documents for AI interpretation or opt into optional updates.</li>
              <li><strong>Legitimate Interests:</strong> Protecting platform integrity, detecting fraud or abusive automated bot attacks, and monitoring server uptime.</li>
              <li><strong>Legal Obligation:</strong> Maintaining statutory accounting, taxation, and billing records under South African financial regulations.</li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* 4. Data Retention, Storage & Deletion */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">4. Data Retention, Storage &amp; Deletion</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We retain personal data only for as long as your Orbit AI account remains active or as needed to deliver our services. If you delete your account or request account closure, we purge your personal identifiers, chat threads, and generated documents within <strong>30 days</strong>, retaining only aggregated, non-identifiable telemetry for historical analytics.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* 5. Your Statutory Rights */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">5. Your Statutory Rights</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              You possess full statutory rights over your personal data under POPIA:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <li>The right to request access to the personal data we hold about you.</li>
              <li>The right to request rectification of inaccurate or outdated information.</li>
              <li>The right to request deletion of your account and personal records.</li>
              <li>The right to object to the processing of personal data for direct marketing purposes.</li>
              <li>The right to lodge a formal complaint with the South African Information Regulator if you believe your POPIA rights have been infringed.</li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* 6. Information Officer & Contact */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">6. Information Officer &amp; Contact</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              For any questions regarding this Privacy Policy, your personal data, or to exercise your statutory rights, please contact our designated Information Officer:
            </p>
            <div className="text-xs sm:text-sm text-slate-600 space-y-1">
              <div><strong>Information Officer:</strong> Ndamulelo Makushu Glen</div>
              <div><strong>Email:</strong> ndamulelomakushu63@gmail.com</div>
              <div><strong>General Support:</strong> support@orbitai.co.za</div>
              <div><strong>Location:</strong> Johannesburg, Gauteng, South Africa</div>
            </div>
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
