import React from 'react';
import { Text, View } from './ReactNativeShim';

interface FormattedMessageProps {
  text: string;
  isUser: boolean;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ text, isUser }) => {
  if (isUser) {
    return <Text className="text-slate-900 text-xs whitespace-pre-wrap font-sans">{text}</Text>;
  }

  // Parse lines for basic markdown accents: lists, bold text, subheadings, etc.
  const lines = text.split('\n');
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

  const parseInlineMarkdown = (str: string): React.ReactNode[] => {
    // Matches **text**
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
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

      if (trimmed === '') {
        elements.push(<div key={lineIdx} className="h-1.5" />);
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <Text key={lineIdx} className="block font-bold text-slate-900 text-xs tracking-tight mt-3 mb-1 font-sans">
            {trimmed.slice(4)}
          </Text>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <Text key={lineIdx} className="block font-semibold text-slate-950 text-sm tracking-tight mt-4 mb-1.5 font-sans border-b border-slate-100 pb-1">
            {trimmed.slice(3)}
          </Text>
        );
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <Text key={lineIdx} className="block font-bold text-slate-950 text-base tracking-tight mt-4 mb-2 font-sans">
            {trimmed.slice(2)}
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
