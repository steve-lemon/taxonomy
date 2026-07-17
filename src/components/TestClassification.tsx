import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, X, Tag, Link2, Box, Code } from 'lucide-react';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { useClassificationStore } from '../store/useClassificationStore';
import { classifyImage, ClassificationResult } from '../services/aiService';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';

export function TestClassification() {
  const { data, theme } = useTaxonomyStore();
  const { t } = useTranslation();
  const { image, result, setImage, setResult, clear } = useClassificationStore();
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImage(base64);
      setResult(null);
      setError(null);
      
      if (!data) return;
      
      setIsClassifying(true);
      try {
        const res = await classifyImage(base64, data);
        setResult(res);
      } catch (err: any) {
        setError(err.message || "Failed to classify image.");
      } finally {
        setIsClassifying(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [data]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleFile(e.clipboardData.files[0]);
    }
  }, [data]);

  return (
    <div className="border border-border-subtle rounded-xl overflow-hidden bg-surface-base flex flex-col xl:flex-row mt-8" onPaste={handlePaste}>
      <div className="w-full xl:w-1/3 p-5 border-b xl:border-b-0 xl:border-r border-border-subtle flex flex-col">
        <h2 className="text-sm uppercase tracking-[1px] font-semibold text-ink mb-4">{t('auto_classification.title')}</h2>
        
        {!image ? (
          <div 
            className="flex-1 min-h-[250px] border-2 border-dashed border-border-subtle rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-surface-light transition-colors"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-accent" />
            </div>
            <p className="text-[14px] font-medium text-ink mb-1">Click to upload or drag & drop</p>
            <p className="text-[12px] text-ink-dim max-w-[200px]">You can also paste an image from your clipboard.</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="relative group rounded-xl overflow-hidden border border-border-subtle bg-bg-base">
            <img src={image} alt="Preview" className="w-full object-contain max-h-[400px]" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <button 
                 onClick={() => { clear(); setError(null); }}
                 className="bg-white/10 backdrop-blur text-white px-3 py-1.5 rounded-full text-[13px] flex items-center font-medium hover:bg-white/20 transition-colors"
               >
                 <X className="w-4 h-4 mr-1" /> Clear Image
               </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-full xl:w-2/3 p-5 bg-surface-light overflow-y-auto">
        {isClassifying ? (
          <div className="h-full min-h-[250px] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-[14px] text-ink">Analyzing image against taxonomy...</p>
          </div>
        ) : error ? (
          <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
               <X className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-[14px] text-red-500 font-medium mb-1">Classification Failed</p>
            <p className="text-[13px] text-ink-dim max-w-sm">{error}</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-6">
            <div className="flex justify-end mb-[-1rem] relative z-10">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode(viewMode === 'ui' ? 'json' : 'ui')}
                className="text-ink-dim hover:text-ink text-[12px] h-7 px-2 bg-surface-base border border-border-subtle"
              >
                {viewMode === 'ui' ? (
                  <><Code className="w-3.5 h-3.5 mr-1" /> View JSON</>
                ) : (
                  <><Box className="w-3.5 h-3.5 mr-1" /> View UI</>
                )}
              </Button>
            </div>
            
            {viewMode === 'json' ? (
              <div className="bg-surface-base border border-border-subtle rounded-lg overflow-hidden shrink-0 mt-2">
                <CodeMirror
                  value={JSON.stringify(result, null, 2)}
                  theme={theme === 'dark' ? vscodeDark : vscodeLight}
                  basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
                  extensions={[json()]}
                  readOnly={true}
                  className="text-[13px]"
                />
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-[11px] uppercase tracking-[1px] font-semibold text-ink-dim flex items-center mb-3">
                    <ImageIcon className="w-3.5 h-3.5 mr-2" /> Global Metadata
                  </h3>
                  <div className="bg-surface-base border border-border-subtle rounded-lg p-4">
                    <div className="mb-4">
                      <div className="text-[10px] uppercase font-mono text-ink-dim mb-2">Categories</div>
                      <div className="flex flex-wrap gap-2">
                        {result.photo_metadata.category_ids.length > 0 ? result.photo_metadata.category_ids.map(c => (
                          <span key={c} className="px-2 py-1 bg-surface-light border border-border-subtle rounded text-[12px] text-ink font-mono">{c}</span>
                        )) : <span className="text-[12px] text-ink-dim italic">None detected</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-mono text-ink-dim mb-2">Attributes</div>
                      {result.photo_metadata.attributes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {result.photo_metadata.attributes.map((a, i) => (
                            <div key={i} className="flex flex-col px-3 py-2 bg-surface-light border border-border-subtle rounded">
                              <span className="text-[10px] text-ink-dim uppercase tracking-wider mb-0.5">{a.key}</span>
                              <span className="text-[13px] text-ink font-medium">{a.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-[12px] text-ink-dim italic">None detected</span>}
                    </div>
                  </div>
                </div>

                {result.entities.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-[1px] font-semibold text-ink-dim flex items-center mb-3">
                      <Box className="w-3.5 h-3.5 mr-2" /> Detected Entities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.entities.map(e => (
                         <div key={e.id} className="bg-surface-base border border-border-subtle rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                               <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent rounded text-[11px] font-bold uppercase tracking-wider">
                                 {e.type}
                               </span>
                               <span className="text-[11px] text-ink-dim font-mono">{e.id}</span>
                            </div>
                            <div className="mb-3">
                              <div className="text-[10px] uppercase font-mono text-ink-dim mb-1.5">Categories</div>
                              <div className="flex flex-wrap gap-1">
                                {e.category_ids.length > 0 ? e.category_ids.map(c => (
                                  <span key={c} className="px-1.5 py-0.5 bg-surface-light border border-border-subtle rounded text-[11px] text-ink font-mono">{c}</span>
                                )) : <span className="text-[11px] text-ink-dim italic">None</span>}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase font-mono text-ink-dim mb-1.5">Attributes</div>
                              {e.attributes.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {e.attributes.map((a, i) => (
                                    <div key={i} className="flex justify-between items-center text-[12px]">
                                      <span className="text-ink-dim">{a.key}:</span>
                                      <span className="text-ink font-medium break-all text-right max-w-[60%]">{a.value}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : <span className="text-[11px] text-ink-dim italic">None</span>}
                            </div>
                         </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.relations.length > 0 && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-[1px] font-semibold text-ink-dim flex items-center mb-3">
                      <Link2 className="w-3.5 h-3.5 mr-2" /> Relations
                    </h3>
                    <div className="bg-surface-base border border-border-subtle rounded-lg divide-y divide-border-subtle">
                      {result.relations.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-3">
                           <span className="text-[12px] font-mono text-ink">{r.from_entity_id}</span>
                           <div className="flex flex-col items-center px-4">
                             <span className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">{r.type}</span>
                             <div className="h-px bg-border-subtle w-16 relative">
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-border-subtle rotate-45 mr-[1px]"></div>
                             </div>
                           </div>
                           <span className="text-[12px] font-mono text-ink">{r.to_entity_id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.entities.length === 0 && result.photo_metadata.category_ids.length === 0 && result.photo_metadata.attributes.length === 0 && (
                   <div className="py-8 text-center text-ink-dim text-[13px] italic">
                     No metadata or entities were extracted. Check if the taxonomy contains relevant properties.
                   </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center opacity-50">
             <ImageIcon className="w-12 h-12 text-ink-dim mb-3" />
             <p className="text-[14px] text-ink font-medium mb-1">Waiting for image</p>
             <p className="text-[13px] text-ink-dim max-w-[200px]">Upload an image to see how your taxonomy classifies it automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
