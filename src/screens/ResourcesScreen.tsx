import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Clock, Tag, Search, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ORBIT_GUIDES, GuideArticle } from '../data/guidesData';
import { useAppState } from '../services/state';

interface ResourcesScreenProps {
  onBack?: () => void;
  onSelectGuide?: (slug: string) => void;
}

export const ResourcesScreen: React.FC<ResourcesScreenProps> = ({ onBack, onSelectGuide }) => {
  const { setMobileScreen } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = ["All", "AI Workflows", "Legal & Compliance", "Career & Employment", "Small Business & Entrepreneurship", "Research & Academic"];

  const filteredGuides = ORBIT_GUIDES.filter(guide => {
    const matchesCategory = selectedCategory === "All" || guide.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === "" || 
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleGuideClick = (slug: string) => {
    if (onSelectGuide) {
      onSelectGuide(slug);
    } else {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/guides/${slug}`);
      }
      setMobileScreen(`guide-${slug}`);
    }
  };

  return (
    <div id="resources_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 shrink-0 z-20 select-none">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack || (() => setMobileScreen('chat'))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Back to Orbit AI"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Orbit Resources &amp; Guides</h1>
              <p className="text-xs text-slate-500">Official AI Playbooks, Compliance &amp; Workflows</p>
            </div>
          </div>

          <button
            onClick={() => setMobileScreen('chat')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium py-1 px-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            Chat
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-24">
          {/* Hero Section */}
          <section className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Editorial Knowledge Base</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Practical Guides for Responsible &amp; Effective AI Use
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Original, peer-reviewed educational articles and practical playbooks created by the Orbit AI engineering team. Tailored specifically for South African entrepreneurs, students, job seekers, and organizations.
            </p>
          </section>

          {/* Search & Filter Bar */}
          <section className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search articles by topic, keyword, or workflow..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Article List */}
          <section className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredGuides.length} published {filteredGuides.length === 1 ? 'article' : 'articles'}</span>
              <span>All articles fact-checked &amp; updated for 2026</span>
            </div>

            <div className="space-y-6">
              {filteredGuides.map(guide => (
                <article 
                  key={guide.id}
                  onClick={() => handleGuideClick(guide.slug)}
                  className="group p-5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl transition cursor-pointer space-y-3 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 px-2 py-0.5 rounded bg-slate-100">
                      {guide.category}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {guide.readTime}
                    </span>
                    <span>&bull;</span>
                    <span>{guide.publishedDate}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition tracking-tight">
                      {guide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {guide.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      By <strong className="text-slate-700">{guide.author.name}</strong> ({guide.author.role})
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
                      Read Guide <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              ))}

              {filteredGuides.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">No articles match your search query.</p>
                  <p className="text-xs text-slate-500">Try adjusting your keywords or clearing the category filter.</p>
                  <button
                    onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
                    className="text-xs font-semibold text-blue-600 hover:underline pt-2 cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Editorial Integrity Footer */}
          <section className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-slate-800" />
              <span>Orbit AI Editorial Standards</span>
            </div>
            <p className="leading-relaxed">
              Every guide published in Orbit Resources undergoes rigorous technical and regulatory review. We do not use automated filler content. Articles cite primary statutory sources (such as POPIA and the Companies Act) and provide actionable, battle-tested prompt templates.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};
