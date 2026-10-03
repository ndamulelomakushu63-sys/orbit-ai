import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

interface AboutScreenProps {
  onBack?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  return (
    <div id="about_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
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
            <h1 className="text-base font-bold text-slate-900 tracking-tight">About Orbit AI</h1>
            <p className="text-xs text-slate-500">South Africa's dedicated AI platform</p>
          </div>
        </div>
      </header>

      {/* Main Content Container - Clean & unboxed */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8 pb-28">
          {/* Mission */}
          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Our Mission</span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Empowering African Productivity with Accessible Artificial Intelligence
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Orbit AI is a mobile-first artificial intelligence companion and productivity platform tailored specifically to the South African socio-economic context. Our platform bridges the gap between advanced generative AI technologies and everyday needs—enabling students, job seekers, freelancers, and small business owners to draft professional documents, build career portfolios, launch viable side hustles, and conduct real-time research with zero friction.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* Features & Tools */}
          <section className="space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Features &amp; Tools</span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
                Comprehensive AI-Powered Ecosystem
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Each module inside Orbit AI addresses practical, high-value productivity tasks:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900">Orbit AI Chat Companion</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fast, markdown-formatted conversational intelligence running on high-speed inference engines. Assists with research, multi-lingual translations, academic inquiries, code debugging, and daily workflow automation.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900">Multimodal Document Analysis</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Direct camera and file upload integration allowing users to capture photos of notes, invoices, or upload PDF contracts for instant AI synthesis, breakdown, and contextual answers.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900">Task Mode &amp; CV Builder</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A guided conversational wizard generating world-class ATS-friendly CVs, tailored cover letters, and formal documentation to dramatically improve employment prospects in competitive markets.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900">AI Side Hustle Generator</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Algorithmically curated business launch blueprints requiring minimal startup capital. Provides localized execution steps, pricing strategies, and marketing templates designed for South African communities.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900">Business Mode &amp; Directory</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enables micro-enterprises to structure official business plans, register local services, and establish an online commercial presence across major South African provinces.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900">Marketplace &amp; Opportunities</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A localized commercial hub connecting freelance talent, job seekers, and clients with vetted gigs, digital assets, and commercial project tenders.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Who We Build For */}
          <section className="space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Who We Build For</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Job Seekers &amp; Graduates:</strong> Craft modern resumes, prepare for interviews, and draft customized motivation letters that bypass automated application filters.
              </li>
              <li>
                <strong>Freelancers &amp; Solopreneurs:</strong> Accelerate content production, contract reviews, client proposals, and daily commercial correspondence.
              </li>
              <li>
                <strong>Township &amp; Township-adjacent Entrepreneurs:</strong> Access institutional-grade business planning tools and actionable market ideas without requiring expensive consultants.
              </li>
              <li>
                <strong>Learners &amp; Knowledge Workers:</strong> Instant multi-disciplinary research, conceptual explanations, coding assistance, and mathematical proofs.
              </li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* Foundation & Governance */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Founding &amp; Technical Governance</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Orbit AI was founded and engineered by <strong>Ndamulelo Makushu Glen</strong>. The platform is hosted with high-reliability global edge infrastructure, backed by Supabase cloud database clusters, and adheres strictly to the Protection of Personal Information Act (POPIA) and international security best practices.
            </p>
            <div className="pt-2 text-xs text-slate-500 flex flex-wrap gap-4">
              <div><strong className="text-slate-700">Official Domain:</strong> orbitai.co.za</div>
              <div><strong className="text-slate-700">Support Email:</strong> ndamulelomakushu63@gmail.com</div>
              <div><strong className="text-slate-700">Location:</strong> Republic of South Africa</div>
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
