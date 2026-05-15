import { useState, useEffect } from 'react';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { MultiStringInput } from '../components/MultiStringInput';
import { Status, Vocabulary } from '../types/taxonomy';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ListTree, Plus, Trash2, AlertCircle } from 'lucide-react';
import { validateTaxonomy } from '../utils/validation';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { StatusToggle } from '../components/ui/StatusToggle';

export function VocabulariesScreen() {
  const { data, updateData } = useTaxonomyStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [vocabToDelete, setVocabToDelete] = useState<string | null>(null);

  useEffect(() => {
    setEditingId(null);
    setDuplicateError(null);
  }, [selectedId]);

  if (!data) return null;

  const vocabs = data.vocabularies;
  const selectedVocab = vocabs.find(v => v.id === selectedId);
  const vocabIndex = vocabs.findIndex(v => v.id === selectedId);

  // Compute validation errors specifically for the currently selected vocabulary
  const validationIssues = validateTaxonomy(data);
  const currentVocabIssues = validationIssues.filter(
    issue => issue.path === `vocabularies[${vocabIndex}]` || issue.path?.startsWith(`vocabularies[${vocabIndex}].`)
  );

  const updateSelectedVocab = (updater: (v: Vocabulary) => void) => {
    if (!selectedId) return;
    updateData(draft => {
      const idx = draft.vocabularies.findIndex(v => v.id === selectedId);
      if (idx !== -1) {
        updater(draft.vocabularies[idx]);
      }
    });
  };

  const handleAddVocab = () => {
    const id = `new_vocab_${Date.now()}`;
    updateData(draft => {
      draft.vocabularies.push({
        id,
        status: 'active',
        terms: []
      });
    });
    setSelectedId(id);
  };

  const handleIdBlur = () => {
    if (!selectedVocab || editingId === null || editingId === selectedVocab.id) {
      setEditingId(null);
      setDuplicateError(null);
      return;
    }

    const isDuplicate = vocabs.some(v => v.id === editingId);
    if (isDuplicate) {
      setDuplicateError(`ID "${editingId}" is already in use.`);
      return;
    }

    const newId = editingId;
    updateData(draft => {
      const idx = draft.vocabularies.findIndex(v => v.id === selectedVocab.id);
      if (idx !== -1) {
        draft.vocabularies[idx].id = newId;
      }
      
      // Update attributes that reference this vocabulary
      draft.attributes.forEach(a => {
        if (a.vocab_ref === selectedVocab.id) {
          a.vocab_ref = newId;
        }
      });
    });
    setSelectedId(newId);
    setEditingId(null);
    setDuplicateError(null);
  };

  const handleDeleteVocabConfirm = () => {
    if (!vocabToDelete) return;
    updateData(draft => {
      const idx = draft.vocabularies.findIndex(v => v.id === vocabToDelete);
      if (idx !== -1) {
        draft.vocabularies.splice(idx, 1);
      }
      draft.attributes.forEach(a => {
        if (a.vocab_ref === vocabToDelete) {
          delete a.vocab_ref;
        }
      });
    });
    if (selectedId === vocabToDelete) setSelectedId(null);
    setVocabToDelete(null);
  };

  // Find attributes using this vocab
  const attributesUsingVocab = selectedVocab ? data.attributes.filter(a => a.vocab_ref === selectedVocab.id) : [];

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border-subtle bg-bg-base flex flex-col h-1/3 md:h-full overflow-hidden shrink-0">
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
           <h3 className="text-[11px] uppercase tracking-[1.5px] text-ink-dim flex items-center justify-between mb-2">
             Vocabularies
             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100 text-ink" onClick={handleAddVocab}>
               <Plus className="w-4 h-4" />
             </Button>
           </h3>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
           {vocabs.map(v => {
             const isSelected = selectedId === v.id;
             return (
               <div 
                 key={v.id}
                 className={`flex items-center px-6 py-[8px] cursor-pointer hover:text-ink text-[13px] border-l-2 transition-colors ${isSelected ? 'border-accent bg-surface-light text-ink' : 'border-transparent text-ink-dim'}`}
                 onClick={() => setSelectedId(v.id)}
               >
                 <ListTree className="w-4 h-4 mr-3 opacity-60" />
                 <span className="truncate">{v.id}</span>
                 {v.status === 'deprecated' && <span className="ml-auto text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full uppercase">Dep</span>}
               </div>
             );
           })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-bg-base overflow-y-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6">
        {selectedVocab ? (
          <div className="flex-1 flex flex-col gap-6 max-w-4xl">
             <div className="bg-surface-base rounded-xl border border-border-subtle p-4 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
                   <div className="w-full max-w-xl pr-0 md:pr-6">
                     <div className="flex flex-col gap-1">
                       <Input 
                         value={editingId !== null ? editingId : selectedVocab.id}
                         onChange={e => {
                           setEditingId(e.target.value);
                           setDuplicateError(null);
                         }}
                         onBlur={handleIdBlur}
                         onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                         className={`text-[24px] md:text-[28px] font-serif mb-1 p-0 border-transparent bg-transparent focus:border-accent focus:bg-surface-light h-10 w-full ${duplicateError ? 'text-red-500' : 'text-ink'}`}
                       />
                       {duplicateError && <span className="text-[11px] text-red-500">{duplicateError}</span>}
                     </div>
                     <div className="text-[12px] text-ink-dim font-mono">Vocabulary</div>
                   </div>
                   <div className="flex items-center shrink-0 self-end md:self-auto">
                      <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={() => setVocabToDelete(selectedVocab.id)} 
                       className="text-ink-dim hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                       title="Delete Vocabulary"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                </div>

                <div className="flex gap-8 border-t border-border-subtle pt-6">
                   <div className="flex flex-col gap-1.5 w-48">
                     <label className="text-[11px] uppercase tracking-[1.5px] text-ink-dim">Status</label>
                     <div className="flex h-[34px] items-center ">
                       <StatusToggle status={selectedVocab.status} onChange={(status) => updateSelectedVocab(v => v.status = status)} />
                     </div>
                   </div>
                   <div className="flex flex-col gap-1.5 w-48">
                     <label className="text-[11px] uppercase tracking-[1.5px] text-ink-dim">Type</label>
                     <select
                       value={selectedVocab.type || 'string'}
                       onChange={(e) => updateSelectedVocab(v => v.type = e.target.value as "string" | "color")}
                       className="bg-bg-base border border-border-subtle text-ink rounded-md px-3 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                     >
                       <option value="string">String</option>
                       <option value="color">Color</option>
                     </select>
                   </div>
                </div>
             </div>

             {/* Terms Editor */}
             <div className="bg-surface-base rounded-xl border border-border-subtle p-4 md:p-8 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                   <h2 className="text-[11px] uppercase tracking-[1.5px] text-ink-dim">Terms</h2>
                   <Button variant="outline" size="sm" onClick={() => updateSelectedVocab(v => v.terms.push({ value: '', status: 'active', aliases: [] }))}>
                     <Plus className="w-4 h-4 mr-1 hidden sm:inline" /> Add Term
                   </Button>
                </div>
                {selectedVocab.terms.length === 0 ? (
                  <div className="py-8 text-center text-ink-dim text-[13px]">
                    No terms in this vocabulary.
                  </div>
                ) : (
                  <div className="border border-border-subtle rounded-lg overflow-x-auto mt-2">
                    <div className={`min-w-[600px] grid ${selectedVocab.type === 'color' ? 'grid-cols-[1fr_140px_110px_2fr_50px]' : 'grid-cols-[1fr_110px_2fr_50px]'} bg-surface-light text-[11px] uppercase tracking-[1px] text-ink-dim p-3 border-b border-border-subtle gap-4`}>
                      <div>Value</div>
                      {selectedVocab.type === 'color' && <div>Color</div>}
                      <div>Status</div>
                      <div>Aliases</div>
                      <div className="text-right">Acts</div>
                    </div>
                    <div className="min-w-[600px] divide-y divide-border-subtle text-[13px] text-ink bg-bg-base flex flex-col">
                      {selectedVocab.terms.map((term, tIdx) => (
                        <div key={tIdx} className={`grid ${selectedVocab.type === 'color' ? 'grid-cols-[1fr_140px_110px_2fr_50px]' : 'grid-cols-[1fr_110px_2fr_50px]'} p-3 items-center gap-4`}>
                          <div>
                            <Input 
                              value={term.value} 
                              onChange={e => updateSelectedVocab(v => v.terms[tIdx].value = e.target.value)}
                              className="w-full text-[13px] h-8 font-mono"
                              placeholder="term_value"
                            />
                          </div>
                          {selectedVocab.type === 'color' && (
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                className="w-8 h-8 p-0.5 bg-bg-base border border-border-subtle rounded cursor-pointer shrink-0"
                                value={term.color_code || '#000000'}
                                onChange={e => updateSelectedVocab(v => v.terms[tIdx].color_code = e.target.value)}
                              />
                              <Input
                                type="text"
                                className="w-full text-[13px] h-8 font-mono uppercase px-2"
                                placeholder="#HEX"
                                value={term.color_code || ''}
                                onChange={e => updateSelectedVocab(v => v.terms[tIdx].color_code = e.target.value)}
                              />
                            </div>
                          )}
                          <div>
                            <StatusToggle
                               status={term.status}
                               onChange={status => updateSelectedVocab(v => v.terms[tIdx].status = status as any)}
                             />
                           </div>
                          <div>
                            <MultiStringInput
                              value={term.aliases || []}
                              onChange={(val) => updateSelectedVocab(v => v.terms[tIdx].aliases = val as string[])}
                              placeholder="Add alias... (press Enter or Tab)"
                              isWarning={(alias) => validationIssues.some(issue => issue.code === 'DUPLICATE_ALIAS' && issue.message === `Alias '${String(alias).toLowerCase()}' is used multiple times.`)}
                            />
                          </div>
                          <div className="text-right">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="text-ink-dim hover:text-red-500 h-8 w-8"
                               onClick={() => updateSelectedVocab(v => v.terms.splice(tIdx, 1))}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        ) : (
           <div className="flex-1 flex items-center justify-center text-ink-dim flex-col space-y-4 bg-surface-base rounded-xl border border-border-subtle m-6">
              <ListTree className="w-12 h-12 text-border-subtle" />
              <p className="text-[13px]">Select a vocabulary to edit</p>
           </div>
        )}

        {selectedVocab && (
          <aside className="w-full xl:w-[240px] shrink-0 xl:border-l border-t xl:border-t-0 border-border-subtle bg-surface-base p-6 rounded-xl xl:rounded-none xl:rounded-r-xl border xl:border-y-0 xl:border-r-0 mt-6 xl:mt-0 xl:h-auto self-start">
            <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Summary</div>
            <div className="text-[12px] flex flex-col gap-4">
               <div className="flex flex-col gap-1">
                 <span className="text-ink-dim">Total Terms</span>
                 <span className="text-ink text-xl font-light">{selectedVocab.terms.length}</span>
               </div>
               
               <div className="border-b border-border-subtle pb-4">
                 <div className="text-[11px] uppercase tracking-[1px] text-ink-dim mb-2 mt-4">Usage</div>
                 {attributesUsingVocab.length === 0 ? (
                   <span className="text-ink-dim">Not used in any attributes.</span>
                 ) : (
                   <ul className="space-y-1">
                      {attributesUsingVocab.map(attr => (
                        <li key={attr.key} className="text-accent font-mono truncate" title={attr.key}>{attr.key}</li>
                      ))}
                   </ul>
                 )}
               </div>
            </div>

            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Validation</div>
              
              {currentVocabIssues.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {currentVocabIssues.map((issue, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border flex flex-col gap-1 ${issue.level === 'ERROR' ? 'bg-red-500/5 border-red-500/20' : 'bg-accent/5 border-accent/20'}`}>
                      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${issue.level === 'ERROR' ? 'text-red-500' : 'text-accent'}`}>
                         {issue.level === 'ERROR' ? <AlertCircle className="w-3.5 h-3.5" /> : null}
                         {issue.level}
                      </div>
                      <div className="text-[12px] text-ink-dim leading-relaxed">
                         {issue.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-ink-dim mb-6">No validation issues specific to this vocabulary.</div>
              )}
            </div>
          </aside>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!vocabToDelete}
        title="Delete Vocabulary"
        message={`Are you sure you want to delete vocabulary "${vocabToDelete}"? This may break attributes referencing it.`}
        onConfirm={handleDeleteVocabConfirm}
        onCancel={() => setVocabToDelete(null)}
      />
    </div>
  );
}
