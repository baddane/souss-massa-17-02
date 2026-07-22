import React from 'react';
import { Link } from 'react-router-dom';

interface MarkdownContentProps {
  text: string;
  className?: string;
  size?: 'sm' | 'lg';   // 'lg' = lecture éditoriale (articles Observatoire)
}

const STYLES = {
  sm: {
    p: 'text-gray-600 text-sm leading-relaxed my-1',
    ul: 'list-disc pl-4 space-y-1 text-gray-600 text-sm my-2',
    li: 'ml-4',
    h2: 'font-bold text-gray-900 text-lg mt-6 mb-2',
    h4: 'font-bold text-gray-800 text-base mt-5 mb-2',
    hr: 'my-4 border-gray-200',
  },
  lg: {
    p: 'text-gray-700 text-lg leading-8 my-4',
    ul: 'list-disc pl-6 space-y-2 text-gray-700 text-lg leading-8 my-4',
    li: 'ml-1 pl-1',
    h2: 'font-black text-gray-900 text-2xl mt-10 mb-4',
    h4: 'font-bold text-gray-800 text-xl mt-7 mb-2',
    hr: 'my-8 border-gray-200',
  },
} as const;

// Gère **gras** et les liens [texte](url).
// Lien interne (commence par '/') → <Link> SPA ; lien externe (http) → <a target=_blank>.
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/;
  while (remaining.length > 0) {
    const m = remaining.match(pattern);
    if (!m || m.index === undefined) { parts.push(remaining); break; }
    if (m.index > 0) parts.push(remaining.slice(0, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={key++}>{m[1]}</strong>);
    } else {
      const label = m[2];
      const url = m[3];
      if (/^https?:\/\//.test(url)) {
        parts.push(<a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{label}</a>);
      } else {
        parts.push(<Link key={key++} to={url} className="text-blue-600 hover:underline">{label}</Link>);
      }
    }
    remaining = remaining.slice(m.index + m[0].length);
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ text, className, size = 'sm' }) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  const s = STYLES[size];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line === '---') {
      elements.push(<hr key={key++} className={s.hr} />);
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={key++} className={s.h4}>{renderInline(line.slice(5))}</h4>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className={s.h2}>{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={key++} className={s.h2}>{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      const items: React.ReactNode[] = [];
      let j = i;
      while (j < lines.length && (lines[j].trim().startsWith('* ') || lines[j].trim().startsWith('- '))) {
        items.push(<li key={j} className={s.li}>{renderInline(lines[j].trim().slice(2))}</li>);
        j++;
      }
      elements.push(<ul key={key++} className={s.ul}>{items}</ul>);
      i = j - 1;
    } else {
      elements.push(<p key={key++} className={s.p}>{renderInline(line)}</p>);
    }
  }

  return <div className={className}>{elements}</div>;
};

export default MarkdownContent;
