import React from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useTheme } from '../../contexts/ThemeContext';

export function UpdatesModal({ open, onClose, updatesContent }) {
  const { currentTheme } = useTheme();

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[999992]"
        onClick={onClose}
        style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }}
      />
      <div className="fixed z-[99999] p-3 update-screen shadow-[0_25px_80px_rgba(0,0,0,.6)]">
        <div
          className="max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            backgroundColor: currentTheme.tableBackground || currentTheme.background,
            borderColor: currentTheme.border,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <div
            className="flex items-center justify-between p-4"
            style={{
              borderBottom: `1px solid ${currentTheme.border}`,
              backgroundColor: `${currentTheme.accent}20`
            }}
          >
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: currentTheme.text }}>
              <span>📋</span>
              Güncelleme Notları
            </h2>
            <button
              onClick={onClose}
              className="text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.target.style.color = currentTheme.text;
                e.target.style.backgroundColor = `${currentTheme.border}30`;
              }}
              onMouseLeave={(e) => {
                e.target.style.color = currentTheme.textSecondary;
                e.target.style.backgroundColor = 'transparent';
              }}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          <div
            className="overflow-y-auto flex-1 p-6 no-scrollbar update-screen__inner"
            style={{
              backgroundColor: currentTheme.background,
              color: currentTheme.text,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {!updatesContent ? (
              <p style={{ color: currentTheme.textSecondary || currentTheme.text }}>
                Güncelleme notları yükleniyor...
              </p>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" style={{ color: currentTheme.accent }} />,
                    h1: ({ ...props }) => <h1 {...props} style={{ color: currentTheme.accent, fontSize: '1.75rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1rem', borderBottom: `2px solid ${currentTheme.accent}`, paddingBottom: '0.5rem' }} />,
                    h2: ({ ...props }) => <h2 {...props} style={{ color: currentTheme.accent, fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.75rem' }} />,
                    h3: ({ ...props }) => <h3 {...props} style={{ color: currentTheme.accent, fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' }} />,
                    hr: ({ ...props }) => <hr {...props} style={{ border: 'none', borderTop: `1px solid ${currentTheme.border}`, margin: '2rem 0' }} />,
                    strong: ({ ...props }) => <strong {...props} style={{ color: currentTheme.accent, fontWeight: 'bold' }} />,
                    p: ({ ...props }) => <p {...props} style={{ color: currentTheme.text, marginBottom: '1rem' }} />,
                    ul: ({ ...props }) => <ul {...props} style={{ margin: '1rem 0', paddingLeft: '1.5rem', listStyleType: 'disc', color: currentTheme.text }} />,
                    ol: ({ ...props }) => <ol {...props} style={{ margin: '1rem 0', paddingLeft: '1.5rem', color: currentTheme.text }} />,
                    li: ({ ...props }) => <li {...props} style={{ marginBottom: '0.5rem', color: currentTheme.text, lineHeight: '1.6' }} />,
                  }}
                >
                  {updatesContent}
                </ReactMarkdown>
                <style>{`
                  .markdown-body {
                    color: ${currentTheme.text};
                    line-height: 1.6;
                  }
                  .markdown-body ul ul {
                    margin: 0.5rem 0;
                    padding-left: 2rem;
                    list-style-type: circle;
                  }
                  .markdown-body ul ul ul {
                    list-style-type: square;
                  }
                  .markdown-body code {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 0.95em;
                    background-color: ${currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background};
                    padding: 2px 6px;
                    border-radius: 4px;
                  }
                  .markdown-body pre {
                    padding: 12px;
                    overflow: auto;
                    border-radius: 10px;
                    background: ${currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background};
                    color: ${currentTheme.text};
                  }
                  .markdown-body table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1rem 0;
                  }
                  .markdown-body th, .markdown-body td {
                    border: 1px solid ${currentTheme.border};
                    padding: 6px 8px;
                    text-align: left;
                  }
                  .markdown-body blockquote {
                    border-left: 4px solid ${currentTheme.accent};
                    padding-left: 12px;
                    color: ${currentTheme.textSecondary || currentTheme.text};
                    margin-left: 0;
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
