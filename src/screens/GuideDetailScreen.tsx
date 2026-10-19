import React from 'react';
import { ArrowLeft, Clock, Calendar, User, Tag, Share2, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react';
import { GuideArticle } from '../data/guidesData';
import { useAppState } from '../services/state';
import { GoogleAdSenseUnit } from '../components/GoogleAdSenseUnit';

interface GuideDetailScreenProps {
  guide: GuideArticle;
  onBack?: () => void;
}

export const GuideDetailScreen: React.FC<GuideDetailScreenProps> = ({ guide, onBack }) => {
  const { setMobileScreen } = useAppState();

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: guide.title,
        text: guide.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        alert("Article link copied to clipboard!");
      }
    }
  };

  return (
    <div id="guide_detail_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 shrink-0 z-20 select-none">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <button
            onClick={onBack || (() => setMobileScreen('resources'))}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 transition cursor-pointer"
            aria-label="Back to resources"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Resources</span>
          </button>

          <span className="text-xs text-slate-400 font-medium truncate max-w-[180px] sm:max-w-xs">
            {guide.category}
          </span>

          <button
            onClick={handleShare}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Share Article"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <article id="guide-publisher-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-28">
          
          {/* Article Header & Meta */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800 px-2.5 py-0.5 rounded-full bg-slate-100">
                {guide.category}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                {guide.readTime}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {guide.publishedDate}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {guide.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              {guide.subtitle}
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  NM
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">{guide.author.name}</span>
                  <span className="text-[11px] text-slate-400">{guide.author.role}</span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400">
                Verified Publisher Content
              </span>
            </div>
          </header>

          {/* Executive Summary Box */}
          <section className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Executive Summary</span>
            <p>{guide.summary}</p>
          </section>

          <hr className="border-slate-200" />

          {/* Article Body - Sections 1 & 2 */}
          {guide.sections.slice(0, 2).map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {section.heading}
              </h2>

              {section.subheading && (
                <h3 className="text-sm sm:text-base font-semibold text-slate-800">
                  {section.subheading}
                </h3>
              )}

              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {p}
                </p>
              ))}

              {section.callout && (
                <div className={`p-4 rounded-xl border space-y-1.5 my-3 ${
                  section.callout.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : section.callout.type === 'framework'
                    ? 'bg-blue-50 border-blue-200 text-blue-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {section.callout.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                    <span>{section.callout.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {section.callout.content}
                  </p>
                </div>
              )}

              {section.templateCode && (
                <div className="my-3">
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800">
                    {section.templateCode}
                  </div>
                </div>
              )}

              {section.listItems && (
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc pl-5 leading-relaxed">
                  {section.listItems.map((item, lIdx) => (
                    <li key={lIdx}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* POLICY-COMPLIANT GOOGLE ADSENSE EDITORIAL AD SLOT */}
          {/* Strictly placed inside substantive, verified publisher content with generous spacing */}
          <div className="py-2">
            <GoogleAdSenseUnit hasContentReady={true} />
          </div>

          {/* Article Body - Remaining Sections */}
          {guide.sections.slice(2).map((section, idx) => (
            <section key={idx + 2} className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {section.heading}
              </h2>

              {section.subheading && (
                <h3 className="text-sm sm:text-base font-semibold text-slate-800">
                  {section.subheading}
                </h3>
              )}

              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {p}
                </p>
              ))}

              {section.callout && (
                <div className={`p-4 rounded-xl border space-y-1.5 my-3 ${
                  section.callout.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <BookOpen className="w-4 h-4 text-slate-700 shrink-0" />
                    <span>{section.callout.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {section.callout.content}
                  </p>
                </div>
              )}

              {section.templateCode && (
                <div className="my-3">
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800">
                    {section.templateCode}
                  </div>
                </div>
              )}

              {section.listItems && (
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc pl-5 leading-relaxed">
                  {section.listItems.map((item, lIdx) => (
                    <li key={lIdx}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <hr className="border-slate-200" />

          {/* Key Takeaways Section */}
          <section className="space-y-3 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-slate-900" />
              <h3 className="text-sm font-bold text-slate-900">Key Takeaways for Practitioners</h3>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc pl-5 leading-relaxed">
              {guide.keyTakeaways.map((item, tIdx) => (
                <li key={tIdx}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Author Footer */}
          <footer className="pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Published by Orbit AI Editorial</span>
              <button
                onClick={onBack || (() => setMobileScreen('resources'))}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                &larr; Back to all Guides
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              &copy; 2026 Orbit AI. Content published under Orbit Educational License. Unauthorized automated scraping or redistribution prohibited.
            </p>
          </footer>

        </article>
      </div>
    </div>
  );
};
