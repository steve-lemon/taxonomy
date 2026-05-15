import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { Button } from '../components/ui/Button';
import { AlertCircle, FileJson, Check, History, Palette } from 'lucide-react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

// Themes
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { nord } from '@uiw/codemirror-theme-nord';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { vscodeLight, vscodeDark } from '@uiw/codemirror-theme-vscode';
import { monokai } from '@uiw/codemirror-theme-monokai';

export function RawScreen() {
  const { data, updateData, theme: appTheme, history, historyIndex, undo, redo, isDirty } = useTaxonomyStore();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const location = useLocation();

  const [editorTheme, setEditorTheme] = useState<string>(() => localStorage.getItem('raw_editor_theme') || 'default');
  const [showHistory, setShowHistory] = useState(false);

  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    if (data) {
      setJsonText(JSON.stringify(data, null, 2));
    }
  }, [data]);

  useEffect(() => {
    // Jump to line if specified in query params
    const params = new URLSearchParams(location.search);
    const lineParam = params.get('line');
    
    if (lineParam && jsonText) {
      let attempts = 0;
      
      const tryJump = () => {
        const view = editorRef.current?.view;
        if (!view) {
          if (attempts < 10) {
            attempts++;
            setTimeout(tryJump, 50);
          }
          return;
        }
        
        try {
          const lineNum = parseInt(lineParam, 10);
          if (lineNum > 0 && lineNum <= view.state.doc.lines) {
            const lineObj = view.state.doc.line(lineNum);
            
            // Set cursor and scroll
            view.dispatch({
              selection: EditorSelection.cursor(lineObj.from),
              effects: EditorView.scrollIntoView(lineObj.from, {y: "center"})
            });
            
            // Focus the editor
            view.focus();
            
            // Optional: briefly flash the active line visually via DOM if possible
            const activeLineEl = view.dom.querySelector('.cm-activeLine') as HTMLElement;
            if (activeLineEl) {
              activeLineEl.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; // Tailwind red-500 fading out
              setTimeout(() => {
                if (activeLineEl) activeLineEl.style.transition = 'background-color 1s ease-out';
                if (activeLineEl) activeLineEl.style.backgroundColor = '';
                setTimeout(() => {
                  if (activeLineEl) activeLineEl.style.transition = '';
                }, 1000);
              }, 100);
            }
          }
        } catch (e) {
          console.error("Error jumping to line:", e);
        }
      };

      tryJump();
    }
  }, [location.search, location.key, jsonText]);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      updateData((draft) => {
        Object.assign(draft, parsed);
        const currentKeys = Object.keys(draft);
        for (const key of currentKeys) {
          if (!(key in parsed)) {
            // @ts-ignore
            delete draft[key];
          }
        }
      });
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Invalid JSON');
      setSuccess(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Invalid JSON');
    }
  };

  const getThemeExtension = () => {
    switch (editorTheme) {
      case 'github': return appTheme === 'dark' ? githubDark : githubLight;
      case 'dracula': return dracula;
      case 'nord': return nord;
      case 'tokyo-night': return tokyoNight;
      case 'vscode': return appTheme === 'dark' ? vscodeDark : vscodeLight;
      case 'monokai': return monokai;
      case 'default':
      default:
        return appTheme;
    }
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;
    setEditorTheme(newTheme);
    localStorage.setItem('raw_editor_theme', newTheme);
  };

  const jumpToSnapshot = (index: number) => {
    if (index === historyIndex) return;
    useTaxonomyStore.getState().jumpToHistory(index);
  };

  if (!data) return null;

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-bg-base">
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b border-border-subtle shrink-0 gap-4">
          <div>
            <h2 className="text-[20px] font-serif text-ink mb-1 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-accent" />
              Raw JSON Editor
            </h2>
            <p className="text-[12px] text-ink-dim">Directly edit the taxonomy bundle's raw data.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-4 self-end md:self-auto w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 mr-auto md:mr-0 pl-1">
               <Palette className="w-4 h-4 text-ink-dim hidden md:block" />
               <select
                 value={editorTheme}
                 onChange={handleThemeChange}
                 className="bg-surface-base border border-border-subtle rounded-md text-[12px] text-ink px-2 py-1 outline-none focus:border-accent"
               >
                 <option value="default">Default</option>
                 <option value="github">GitHub</option>
                 <option value="dracula">Dracula</option>
                 <option value="nord">Nord</option>
                 <option value="tokyo-night">Tokyo Night</option>
                 <option value="vscode">VS Code</option>
                 <option value="monokai">Monokai</option>
               </select>
               <button 
                 onClick={() => setShowHistory(!showHistory)} 
                 className={`ml-1 md:ml-2 p-1.5 rounded-md flex items-center gap-1.5 transition-colors border ${showHistory ? 'bg-surface-light border-border-subtle text-ink' : 'border-transparent text-ink-dim hover:text-ink hover:bg-surface-base'}`}
                 title="Change History"
               >
                 <History className="w-4 h-4" />
                 <span className="text-[12px] hidden md:inline">History</span>
               </button>
            </div>
          
            {error && (
              <div className="flex items-center text-red-500 text-[12px]">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">{error}</span>
              </div>
            )}
            {success && (
               <div className="flex items-center text-green-500 text-[12px]">
                 <Check className="w-4 h-4 mr-1" />
                 <span className="hidden md:inline">Changes applied</span>
               </div>
            )}
            <Button variant="outline" size="sm" onClick={handleFormat}>Format</Button>
            <Button size="sm" onClick={handleApply}>Apply Changes</Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden" id="raw-editor-container">
          <CodeMirror
            ref={editorRef}
            value={jsonText}
            height="100%"
            theme={getThemeExtension()}
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, highlightActiveLineGutter: true }}
            extensions={[json(), EditorView.lineWrapping]}
            onChange={(value) => {
              setJsonText(value);
              setError(null);
              setSuccess(false);
            }}
            className="h-full text-[13px] font-mono whitespace-pre outline-none"
          />
        </div>
      </div>
      
      {showHistory && (
        <div className="w-full md:w-[280px] border-t md:border-t-0 md:border-l border-border-subtle bg-surface-base flex flex-col h-1/3 md:h-full shrink-0">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-[12px] uppercase tracking-[1px] font-bold text-ink flex items-center gap-2">
              <History className="w-4 h-4" />
              Change History
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {history.map((snapshot, idx) => (
              <button
                key={idx}
                onClick={() => jumpToSnapshot(idx)}
                className={`text-left p-3 rounded-lg border text-[12px] flex items-center justify-between transition-colors
                  ${idx === historyIndex 
                    ? 'bg-accent/10 border-accent/30 text-ink cursor-default' 
                    : 'bg-surface-light border-border-subtle text-ink-dim hover:bg-surface-base hover:text-ink'
                  }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold">Snapshot #{idx + 1}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    v{snapshot.schema_version} - {snapshot.attributes.length} attrs
                  </span>
                </div>
                {idx === historyIndex && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            )).reverse()}
          </div>
        </div>
      )}
    </div>
  );
}
