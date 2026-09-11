import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

interface LatexRendererProps {
  math: string;
  block?: boolean;
}

/**
 * Componente reutilizable para renderizar LaTeX.
 * Aplica el principio DRY y KISS.
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({ math, block = false }) => {
  if (block) {
    return (
      <div className="my-2 overflow-x-auto text-left text-[13px] md:text-sm custom-scrollbar">
        <BlockMath math={math} />
      </div>
    );
  }
  return <InlineMath math={math} />;
};

export const TextWithMath: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  
  return (
    <div className="text-white/85 text-sm leading-relaxed space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <div key={index} className="my-3 overflow-x-auto custom-scrollbar">
              <BlockMath math={part.slice(2, -2)} />
            </div>
          );
        } else if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index} math={part.slice(1, -1)} />;
        } else {
          // Render plain text with basic formatting (newlines to <br/>, **bold** to <strong>)
          const formattedText = part
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .split('\n')
            .map((line, i) => (
              <React.Fragment key={`${index}-${i}`}>
                {line.startsWith('# ') ? <h2 className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h2> :
                 line.startsWith('## ') ? <h3 className="text-base font-bold text-white mt-3 mb-1">{line.slice(3)}</h3> :
                 line.startsWith('- ') ? <div className="ml-4 flex gap-2"><span className="text-indigo-400">•</span><span dangerouslySetInnerHTML={{ __html: line.slice(2) }} /></div> :
                 <span dangerouslySetInnerHTML={{ __html: line }} />}
                {i < part.split('\n').length - 1 && <br />}
              </React.Fragment>
            ));
          return <span key={index}>{formattedText}</span>;
        }
      })}
    </div>
  );
};
