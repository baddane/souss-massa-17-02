import React from 'react';
import { Link } from 'react-router-dom';

interface MarkdownContentProps {
  text: string;
  className?: string;
}

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

const MarkdownContent: React.FC<MarkdownContentProps> = ({ text, className }) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line === '---') {
      elements.push(<hr key={key++} className="my-4 border-gray-200" />);
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={key++} className="font-bold text-gray-800 text-base mt-5 mb-2">{renderInline(line.slice(5))}</h4>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="font-bold text-gray-900 text-lg mt-6 mb-2">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={key++} className="font-bold text-gray-900 text-lg mt-6 mb-2">{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      const items: React.ReactNode[] = [];
      let j = i;
      while (j < lines.length && (lines[j].trim().startsWith('* ') || lines[j].trim().startsWith('- '))) {
        items.push(<li key={j} className="ml-4">{renderInline(lines[j].trim().slice(2))}</li>);
        j++;
      }
      elements.push(<ul key={key++} className="list-disc pl-4 space-y-1 text-gray-600 text-sm my-2">{items}</ul>);
      i = j - 1;
    } else {
      elements.push(<p key={key++} className="text-gray-600 text-sm leading-relaxed my-1">{renderInline(line)}</p>);
    }
  }

  return <div className={className}>{elements}</div>;
};

export default MarkdownContent;
