import React, { useState } from 'react';
import { View } from './ReactNativeShim';
import { Check, Copy } from 'lucide-react';

interface FormattedMessageProps {
  text?: string;
  message?: string;
  isUser?: boolean;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ text, message, isUser = false }) => {
  const content = text || message || '';

  if (isUser) {
    return (
      <div className="text-slate-900 text-[14px] sm:text-[15px] leading-[1.6] whitespace-pre-wrap font-sans select-text">
        {content}
      </div>
    );
  }

  // Parse lines for ChatGPT-style assistant markdown: headings, lists, code blocks, paragraphs
  const lines = (content || '').split('\n');
  const elements: React.ReactNode[] = [];

  let inBulletList = false;
  let bulletItems: string[] = [];

  let inNumberedList = false;
  let numberedItems: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  const flushBulletList = (key: string | number) => {
    if (bulletItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 my-2.5 space-y-1.5 text-slate-800 text-[14px] sm:text-[15px] leading-[1.65]">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="leading-[1.65] font-sans">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      bulletItems = [];
      inBulletList = false;
    }
  };

  const flushNumberedList = (key: string | number) => {
    if (numberedItems.length > 0) {
      elements.push(
        <ol key={`ol-${key}`} className="list-decimal pl-5 my-2.5 space-y-1.5 text-slate-800 text-[14px] sm:text-[15px] leading-[1.65]">
          {numberedItems.map((item, idx) => (
            <li key={idx} className="leading-[1.65] font-sans">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      numberedItems = [];
      inNumberedList = false;
    }
  };

  const flushCodeBlock = (key: string | number) => {
    if (codeBlockLines.length > 0 || inCodeBlock) {
      const codeText = codeBlockLines.join('\n');
      elements.push(
        <CodeBlockView key={`code-${key}`} code={codeText} language={codeBlockLang} />
      );
      codeBlockLines = [];
      codeBlockLang = '';
      inCodeBlock = false;
    }
  };

  const parseInlineMarkdown = (str: string = ''): React.ReactNode[] => {
    const tokenRegex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = str.split(tokenRegex);
    return parts.map((part, idx) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code key={idx} className="font-mono text-[13px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200/70">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Code block toggle (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(lineIdx);
      } else {
        flushBulletList(lineIdx);
        flushNumberedList(lineIdx);
        inCodeBlock = true;
        codeBlockLang = trimmed.replace(/^```/, '').trim();
        codeBlockLines = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Bullet list item (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushNumberedList(lineIdx);
      inBulletList = true;
      bulletItems.push(trimmed.slice(2));
      return;
    }

    // Numbered list item (1. 2. etc)
    if (trimmed.match(/^\d+\.\s/)) {
      flushBulletList(lineIdx);
      inNumberedList = true;
      numberedItems.push(trimmed.replace(/^\d+\.\s/, ''));
      return;
    }

    // Normal non-list item
    flushBulletList(lineIdx);
    flushNumberedList(lineIdx);

    // Empty line or horizontal divider
    if (trimmed === '' || trimmed.match(/^[\*\-_]{3,}$/)) {
      if (trimmed.match(/^[\*\-_]{3,}$/)) {
        elements.push(<hr key={lineIdx} className="border-t border-slate-200/90 my-4" />);
      } else {
        elements.push(<div key={lineIdx} className="h-2" />);
      }
      return;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      const cleanTitle = trimmed.replace(/^#\s*/, '').replace(/\*/g, '');
      elements.push(
        <h1 key={lineIdx} className="text-xl sm:text-2xl font-bold text-slate-900 mt-5 mb-2.5 tracking-tight font-sans">
          {cleanTitle}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      const cleanTitle = trimmed.replace(/^##\s*/, '').replace(/\*/g, '');
      elements.push(
        <h2 key={lineIdx} className="text-lg sm:text-xl font-bold text-slate-900 mt-4 mb-2 tracking-tight font-sans border-b border-slate-150/80 pb-1">
          {cleanTitle}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      const cleanTitle = trimmed.replace(/^###\s*/, '').replace(/\*/g, '');
      elements.push(
        <h3 key={lineIdx} className="text-[15px] sm:text-base font-semibold text-slate-900 mt-3.5 mb-1.5 tracking-tight font-sans">
          {cleanTitle}
        </h3>
      );
    } else if (trimmed.startsWith('> ')) {
      const content = trimmed.slice(2);
      elements.push(
        <blockquote key={lineIdx} className="border-l-3 border-blue-500/70 pl-3.5 py-1 my-2 bg-blue-50/30 rounded-r-lg italic text-slate-700 text-[14px] sm:text-[15px] font-sans">
          {parseInlineMarkdown(content)}
        </blockquote>
      );
    } else {
      // Normal paragraph
      elements.push(
        <p key={lineIdx} className="text-slate-800 text-[14px] sm:text-[15px] leading-[1.68] my-1.5 font-sans whitespace-pre-wrap">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  });

  if (inCodeBlock) flushCodeBlock('end');
  flushBulletList('end');
  flushNumberedList('end');

  return <div className="space-y-0.5 select-text leading-relaxed text-slate-800">{elements}</div>;
};

interface CodeBlockViewProps {
  code: string;
  language?: string;
}

const CodeBlockView: React.FC<CodeBlockViewProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 font-mono text-[13px] shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800/90 text-[11px] text-slate-400 font-sans select-none">
        <span className="font-mono text-slate-300 uppercase tracking-wider">{language || 'code'}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800 cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};
