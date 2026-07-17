import React, { useState } from 'react';
import { Bot, X, Send, Loader2, Check, Settings2, ImagePlus, User, Trash2, FileText } from 'lucide-react';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { analyzeAndModifyTaxonomy, GenerativeModelType, ChatMessage } from '../services/aiService';
import { TaxonomyFile } from '../types/taxonomy';

export function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposedPlan, setProposedPlan] = useState<string | null>(null);
  const [proposedTaxonomy, setProposedTaxonomy] = useState<TaxonomyFile | null>(null);
  const [selectedModel, setSelectedModel] = useState<GenerativeModelType>('gemini-2.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('copilot_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedDocs, setAttachedDocs] = useState<{name: string, content: string}[]>([]);

  // Update localStorage when history changes
  React.useEffect(() => {
    localStorage.setItem('copilot_history', JSON.stringify(chatHistory));
  }, [chatHistory]);
  
  const { data, updateData } = useTaxonomyStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!query.trim() && attachedDocs.length === 0) || !data || loading) return;

    setLoading(true);
    setError(null);
    setProposedPlan(null);
    setProposedTaxonomy(null);
    
    try {
      let finalQuery = query;
      if (!finalQuery.trim() && attachedDocs.length > 0) {
        finalQuery = "Please generate or update the schema based on the attached document(s).";
      }
      if (attachedDocs.length > 0) {
        finalQuery += '\n\n' + attachedDocs.map(doc => `--- ${doc.name} ---\n${doc.content}`).join('\n\n');
      }
      
      const response = await analyzeAndModifyTaxonomy(data, finalQuery, selectedModel, attachedImages, chatHistory);
      setProposedPlan(response.plan);
      setProposedTaxonomy(response.new_taxonomy);
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing the request.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (proposedTaxonomy) {
      updateData(draft => {
        Object.assign(draft, proposedTaxonomy);
      });
      
      let finalQuery = query;
      if (attachedDocs.length > 0) {
        finalQuery += ` [Attached ${attachedDocs.length} Docs]`;
      }
      
      setChatHistory(prev => {
        const newHistory: ChatMessage[] = [
          ...prev,
          { role: 'user', text: finalQuery + (attachedImages.length > 0 ? ' [Attached Images]' : '') },
          { role: 'model', text: proposedPlan || 'Applied changes as requested.' }
        ];
        return newHistory.slice(-5);
      });

      setProposedPlan(null);
      setProposedTaxonomy(null);
      setQuery('');
      setAttachedImages([]);
      setAttachedDocs([]);
    }
  };

  const handleCancelPlan = () => {
    setProposedPlan(null);
    setProposedTaxonomy(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent/90 transition-transform hover:scale-105 z-50 flex-col group p-2"
        title="AI Assistant"
      >
        <Bot className="w-7 h-7" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] bg-surface-base border border-border-subtle rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden transform transition-all">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-light border-b border-border-subtle">
            <div className="flex items-center gap-2 text-ink">
              <Bot className="w-5 h-5 text-accent" />
              <span className="font-semibold text-sm">Taxonomy Copilot</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setChatHistory([])} className="text-ink-dim hover:text-ink" title="Clear History">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className="text-ink-dim hover:text-ink">
                <Settings2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-ink-dim hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="px-4 py-3 bg-bg-base border-b border-border-subtle flex items-center justify-between">
              <span className="text-[12px] text-ink-dim items-center">Model:</span>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value as GenerativeModelType)}
                className="bg-surface-base border border-border-subtle rounded px-2 py-1 text-[12px] text-ink focus:outline-none focus:border-accent"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Powerful)</option>
              </select>
            </div>
          )}

          <div className="flex-1 p-4 bg-bg-base text-sm text-ink flex flex-col gap-3 min-h-[150px] max-h-[400px] overflow-y-auto">
            {chatHistory.length === 0 && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                   <Bot className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 bg-surface-light p-3 rounded-lg rounded-tl-none border border-border-subtle">
                  <p>Hi! How can I help you improve your taxonomy?</p>
                </div>
              </div>
            )}
            
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-ink/10 text-ink' : 'bg-accent/10 text-accent'}`}>
                   {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`flex-1 p-3 rounded-lg border border-border-subtle whitespace-pre-wrap ${msg.role === 'user' ? 'bg-surface-base rounded-tr-none' : 'bg-surface-light rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {proposedPlan && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                   <Bot className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 bg-surface-light p-3 rounded-lg rounded-tl-none border border-border-subtle">
                  <p className="font-semibold mb-2">Here's my plan:</p>
                  <p className="whitespace-pre-wrap text-ink-dim">{proposedPlan}</p>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={handleApprove}
                      className="flex-1 bg-accent text-white px-3 py-1.5 rounded text-[13px] font-medium flex justify-center items-center gap-1 hover:bg-accent/90"
                    >
                      <Check className="w-4 h-4" /> Approve & Apply
                    </button>
                    <button 
                      onClick={handleCancelPlan}
                      className="flex-1 bg-surface-base border border-border-subtle text-ink-dim px-3 py-1.5 rounded text-[13px] font-medium hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-[13px]">
                {error}
              </div>
            )}
          </div>

          
          {(attachedImages.length > 0 || attachedDocs.length > 0) && (
            <div className="px-3 pt-3 flex flex-col gap-2 overflow-x-auto bg-surface-base border-t border-border-subtle">
              {attachedImages.length > 0 && (
                <div className="flex gap-2">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 shrink-0 border border-border-subtle rounded-md overflow-hidden bg-surface-light">
                      <img src={img} alt="attachment" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachedDocs.length > 0 && (
                <div className="flex flex-col gap-1 pb-1">
                  {attachedDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-surface-light border border-border-subtle rounded px-2 py-1 text-[12px]">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <FileText className="w-3.5 h-3.5 text-ink-dim shrink-0" />
                        <span className="truncate text-ink">{doc.name}</span>
                      </div>
                      <button type="button" onClick={() => setAttachedDocs(prev => prev.filter((_, i) => i !== idx))} className="text-ink-dim hover:text-red-500 ml-2 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border-subtle bg-surface-base flex items-center gap-2">
            <label className="cursor-pointer text-ink-dim hover:text-accent disabled:opacity-50 flex items-center shrink-0" title="Attach Image">
               <ImagePlus className="w-5 h-5" />
               <input 
                 type="file" 
                 accept="image/*"
                 multiple
                 className="hidden" 
                 disabled={loading || !!proposedPlan}
                 onChange={(e) => {
                   if (!e.target.files) return;
                   const files = Array.from(e.target.files) as File[];
                   files.forEach(file => {
                     const reader = new FileReader();
                     reader.onload = (event) => {
                       if (event.target?.result) {
                         setAttachedImages(prev => [...prev, event.target!.result as string]);
                       }
                     };
                     reader.readAsDataURL(file);
                   });
                   e.target.value = '';
                 }} 
               />
            </label>
            <label className="cursor-pointer text-ink-dim hover:text-accent disabled:opacity-50 flex items-center shrink-0" title="Attach Document (.md, .txt)">
               <FileText className="w-4 h-4 ml-0.5" />
               <input 
                 type="file" 
                 accept=".md,.txt"
                 multiple
                 className="hidden" 
                 disabled={loading || !!proposedPlan}
                 onChange={(e) => {
                   if (!e.target.files) return;
                   const files = Array.from(e.target.files) as File[];
                   files.forEach(file => {
                     const reader = new FileReader();
                     reader.onload = (event) => {
                       if (typeof event.target?.result === 'string') {
                         setAttachedDocs(prev => [...prev, { name: file.name, content: event.target!.result as string }]);
                       }
                     };
                     reader.readAsText(file);
                   });
                   e.target.value = '';
                 }} 
               />
            </label>
            <div className="flex-1 border border-border-subtle rounded-md bg-bg-base overflow-hidden flex items-center ml-1">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Bundle purpose, requirements..."
                className="w-full px-3 py-2 text-[13px] text-ink focus:outline-none bg-transparent"
                disabled={loading || !!proposedPlan}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || (!query.trim() && attachedDocs.length === 0) || !!proposedPlan}
              className="w-10 h-10 flex flex-shrink-0 items-center justify-center bg-accent text-white rounded-md disabled:opacity-50 hover:bg-accent/90 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
