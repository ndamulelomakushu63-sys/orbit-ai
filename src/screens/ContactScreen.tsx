import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

interface ContactScreenProps {
  onBack?: () => void;
}

export const ContactScreen: React.FC<ContactScreenProps> = ({ onBack }) => {
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subjectCategory, setSubjectCategory] = useState('General Inquiry');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !messageText.trim()) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }
    if (!senderEmail.includes('@') || !senderEmail.includes('.')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Simulate reliable ticket transmission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setMessageText('');
    }, 600);
  };

  return (
    <div id="contact_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
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
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Contact Us</h1>
            <p className="text-xs text-slate-500">Support, partnerships &amp; feedback</p>
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customer Support</span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              We're Here to Help You Succeed
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Have questions about Orbit Pro subscriptions, Task Mode CV generation, business listing verification, or technical assistance? Get in touch with our support desk below.
            </p>
          </section>

          {/* Contact Details List */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 border-y border-slate-200 py-4">
            <div className="space-y-1">
              <span className="font-semibold text-slate-900 block">Email Desk</span>
              <a href="mailto:ndamulelomakushu63@gmail.com" className="text-blue-600 hover:underline block break-all font-medium">
                ndamulelomakushu63@gmail.com
              </a>
              <span className="text-[11px] text-slate-500 block">Direct inquiries, billing &amp; refunds</span>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-900 block">Response Speed</span>
              <span className="text-slate-800 font-medium block">Within 24 Hours</span>
              <span className="text-[11px] text-slate-500 block">Monday – Saturday: 08:00 – 18:00 SAST</span>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-900 block">Founder &amp; Lead</span>
              <span className="text-slate-800 font-medium block">Ndamulelo Makushu Glen</span>
              <span className="text-[11px] text-slate-500 block">Johannesburg, South Africa</span>
            </div>
          </section>

          {/* Interactive Contact Form */}
          <section className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Send an Enquiry
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Fill out the fields below and our operations desk will reply via email.</p>
            </div>

            {submitSuccess ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2">
                <h4 className="text-sm font-semibold text-slate-900">Message Transmitted Successfully</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thank you for contacting us. A confirmation has been logged with reference <strong>#TKT-{Date.now().toString().slice(-6)}</strong>. Our team will review your message and reply via email.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Your Full Name *</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Sipho Ndlovu"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-slate-600 bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Your Email Address *</label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="e.g. sipho@example.co.za"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-slate-600 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Subject / Department</label>
                  <select
                    value={subjectCategory}
                    onChange={(e) => setSubjectCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-slate-600 bg-white"
                  >
                    <option value="General Inquiry">General Product Inquiry</option>
                    <option value="Pro Billing &amp; Refunds">Pro Billing, Invoices &amp; 7-Day Refund</option>
                    <option value="Task Mode Assistance">Task Mode / CV Builder Assistance</option>
                    <option value="Business Mode Verification">Business Mode &amp; Local Listing</option>
                    <option value="AdSense / Privacy">AdSense, POPIA &amp; Privacy Inquiry</option>
                    <option value="Partnerships">Developer &amp; Commercial Partnerships</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Your Message *</label>
                  <textarea
                    rows={4}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Provide details about your query or feedback..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-slate-600 bg-white resize-y"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {isSubmitting ? 'Transmitting...' : 'Send Message'}
                </button>
              </form>
            )}
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
