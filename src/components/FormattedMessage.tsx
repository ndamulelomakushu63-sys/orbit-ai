import React from 'react';
import { Text, View } from './ReactNativeShim';

interface FormattedMessageProps {
  text?: string;
  message?: string;
  isUser?: boolean;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ text, message, isUser = false }) => {
  const content = text || message || '';

  if (isUser) {
    return <Text className="text-slate-900 text-xs whitespace-pre-wrap font-sans">{content}</Text>;
  }

  // Parse lines for basic markdown accents: lists, bold text, subheadings, etc.
  const lines = (content || '').split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1.5 text-slate-800 text-xs">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed font-sans">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const parseInlineMarkdown = (str: string = ''): React.ReactNode[] => {
    // Matches **text**
    const parts = (str || '').split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part && part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Bullet list item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(trimmed.slice(2));
    } else if (trimmed.match(/^\d+\.\s/)) {
      // Numbered list item
      flushList(lineIdx);
      const matchNum = trimmed.match(/^(\d+)\.\s/);
      const num = matchNum ? matchNum[1] : "1";
      const content = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={lineIdx} className="flex gap-2 my-2 text-xs text-slate-800 font-sans leading-relaxed">
          <span className="font-bold text-blue-600 shrink-0">{num}.</span>
          <div className="flex-1 shrink whitespace-pre-wrap">{parseInlineMarkdown(content)}</div>
        </div>
      );
    } else {
      flushList(lineIdx);

      if (trimmed === '' || trimmed.match(/^[\*\-_]{3,}$/)) {
        elements.push(<div key={lineIdx} className="h-2 border-b border-slate-100 my-1" />);
      } else if (trimmed.startsWith('### ')) {
        const cleanTitle = trimmed.replace(/^###\s*/, '').replace(/\*/g, '');
        elements.push(
          <Text key={lineIdx} className="block font-bold text-slate-900 text-xs tracking-tight mt-3.5 mb-1.5 font-sans uppercase">
            {cleanTitle}
          </Text>
        );
      } else if (trimmed.startsWith('## ')) {
        const cleanTitle = trimmed.replace(/^##\s*/, '').replace(/\*/g, '');
        elements.push(
          <Text key={lineIdx} className="block font-bold text-slate-950 text-xs tracking-wider mt-4 mb-2 font-sans uppercase border-b border-slate-150 pb-1">
            {cleanTitle}
          </Text>
        );
      } else if (trimmed.startsWith('# ')) {
        const cleanTitle = trimmed.replace(/^#\s*/, '').replace(/\*/g, '');
        elements.push(
          <Text key={lineIdx} className="block font-extrabold text-slate-950 text-sm tracking-tight mt-4 mb-2 font-sans uppercase">
            {cleanTitle}
          </Text>
        );
      } else {
        elements.push(
          <Text key={lineIdx} className="block text-slate-800 text-xs leading-relaxed my-1 font-sans whitespace-pre-wrap">
            {parseInlineMarkdown(line)}
          </Text>
        );
      }
    }
  });

  flushList(lines.length);

  return <View className="space-y-0.5 select-text">{elements}</View>;
};
