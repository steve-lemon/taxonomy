import React, { useEffect, useState, useRef } from 'react';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Sparkles, Image as ImageIcon, X, Upload, Trash2 } from 'lucide-react';
import { generateTaxonomyFromAi, GenerativeModelType } from '../services/aiService';
import { saveJson, deleteJson } from '../services/api';

export function BundlePicker() {
  const { bundles, loading, error, fetchBundles, selectBundle } = useTaxonomyStore();
  const [mode, setMode] = useState<'select' | 'generate'>('select');
  
  // AI Generation State
  const [purpose, setPurpose] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [model, setModel] = useState<GenerativeModelType>('gemini-2.5-pro');
  const [language, setLanguage] = useState<string>('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  // Handle paste events on window when in generate mode
  useEffect(() => {
    if (mode !== 'generate') return;
    
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
          }
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode]);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImages(prev => [...prev, result]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!purpose.trim() && images.length === 0) {
      setAiError("Please provide a purpose or an image.");
      return;
    }
    
    setIsGenerating(true);
    setAiError(null);
    
    try {
      const taxonomyData = await generateTaxonomyFromAi(purpose, images, model, language);
      
      // Assign a unique key
      const key = `ai_generated_${Date.now()}`;
      await saveJson(key, taxonomyData);
      
      // Auto-select the newly generated bundle
      await fetchBundles();
      await selectBundle(key);
      
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate taxonomy. Please check your API key and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete === key) {
      await deleteJson(key);
      await fetchBundles();
      setConfirmDelete(null);
    } else {
      setConfirmDelete(key);
      setTimeout(() => {
        setConfirmDelete(prev => prev === key ? null : prev);
      }, 3000);
    }
  };

  if (loading && bundles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base text-ink">
        <p className="text-ink-dim">Loading bundles...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base p-4">
      <div className="w-full max-w-lg bg-surface-base p-6 md:p-8 rounded-xl shadow-sm border border-border-subtle">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif italic text-accent">Taxonomy Management</h1>
          {mode === 'select' ? (
            <Button variant="ghost" size="sm" onClick={() => setMode('generate')} className="text-accent gap-2">
              <Sparkles className="w-4 h-4" /> AI Generate
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setMode('select')}>Back to Select</Button>
          )}
        </div>

        {mode === 'select' ? (
          <>
            <p className="text-sm text-ink-dim mb-6">Select a taxonomy bundle to edit.</p>
            {error && (
              <div className="mb-4 p-3 bg-red-900/10 text-red-500 border border-red-500/20 rounded text-sm">
                 {error}
              </div>
            )}
            {bundles.length === 0 ? (
              <div className="text-center py-8">
                 <p className="text-sm text-ink-dim">No bundles found.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {bundles.map((bundleKey) => (
                  <li key={bundleKey} className="flex gap-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-mono"
                      onClick={() => selectBundle(bundleKey)}
                      disabled={loading}
                    >
                      {bundleKey}
                    </Button>
                    <Button
                      variant="outline"
                      className={`px-3 transition-colors ${
                        confirmDelete === bundleKey
                          ? 'bg-red-500 text-white hover:bg-red-600 border-red-600'
                          : 'text-red-500 border-red-500/20 hover:bg-red-500/10'
                      }`}
                      onClick={(e) => handleDelete(bundleKey, e)}
                      disabled={loading}
                    >
                      {confirmDelete === bundleKey ? 'Sure?' : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-ink-dim">Describe the domain or paste reference images to generate a new taxonomy.</p>
            
            {aiError && (
              <div className="p-3 bg-red-900/10 text-red-500 border border-red-500/20 rounded text-sm">
                 {aiError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-[1px] text-ink-dim font-bold">Model</label>
                <select
                  className="w-full bg-bg-base border border-border-subtle text-ink rounded-md p-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                  value={model}
                  onChange={(e) => setModel(e.target.value as GenerativeModelType)}
                >
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-[1px] text-ink-dim font-bold">Language</label>
                <select
                  className="w-full bg-bg-base border border-border-subtle text-ink rounded-md p-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Korean">한국어 (Korean)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[1px] text-ink-dim font-bold">Purpose / Domain Description</label>
              <textarea
                className="w-full bg-bg-base border border-border-subtle text-ink rounded-md p-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent min-h-[80px]"
                placeholder="e.g. A comprehensive taxonomy for an e-commerce electronics store..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-[1px] text-ink-dim font-bold">Reference Images</label>
                <span className="text-[11px] text-ink-dim italic">Paste or Upload</span>
              </div>
              <div 
                className="border-2 border-dashed border-border-subtle rounded-xl p-6 text-center hover:bg-surface-light transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      Array.from(e.target.files).forEach(handleImageFile);
                    }
                  }}
                />
                <ImageIcon className="w-8 h-8 text-ink-dim opacity-50 mx-auto mb-2" />
                <p className="text-[13px] text-ink-dim font-medium">Click to upload or Ctrl+V to paste images</p>
              </div>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-md border border-border-subtle overflow-hidden bg-bg-base group">
                        <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              className="w-full mt-4 bg-accent hover:bg-accent/90 text-white font-medium" 
              onClick={handleGenerate}
              disabled={isGenerating || (!purpose.trim() && images.length === 0)}
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Initial Setup
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
