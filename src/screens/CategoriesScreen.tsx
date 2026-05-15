import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { MultiStringInput } from '../components/MultiStringInput';
import { Category, Status } from '../types/taxonomy';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Folder, FolderOpen, Plus, Settings2, Trash2, AlertCircle, Search } from 'lucide-react';
import { validateTaxonomy } from '../utils/validation';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { StatusToggle } from '../components/ui/StatusToggle';

export function CategoriesScreen() {
  const { data, updateData } = useTaxonomyStore();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(location.state?.selectedId || null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [catToDelete, setCatToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setEditingId(null);
    setDuplicateError(null);
  }, [selectedId]);

  if (!data) return null;

  const cats = data.categories;

  // Build tree
  const rootCats = cats.filter(c => !c.parent_id);
  const selectedCat = cats.find(c => c.id === selectedId);
  const selectedCatIndex = cats.findIndex(c => c.id === selectedId);

  const validationIssues = validateTaxonomy(data);
  const currentCatIssues = validationIssues.filter(
    issue => issue.path === `categories[${selectedCatIndex}]` || issue.path?.startsWith(`categories[${selectedCatIndex}].`)
  );

  const searchLower = searchQuery.toLowerCase();

  const matchesSearch = (cat: Category): boolean => {
    if (!searchLower) return true;
    if (cat.name.toLowerCase().includes(searchLower)) return true;
    if (cat.aliases?.some(a => a.toLowerCase().includes(searchLower))) return true;
    return false;
  };

  const descendantMatchCache = new Map<string, boolean>();
  const hasMatchingDescendant = (catId: string): boolean => {
    if (descendantMatchCache.has(catId)) return descendantMatchCache.get(catId)!;
    const children = cats.filter(c => c.parent_id === catId);
    const hasMatch = children.some(c => matchesSearch(c) || hasMatchingDescendant(c.id));
    descendantMatchCache.set(catId, hasMatch);
    return hasMatch;
  };

  // Helper to render tree node
  const renderTree = (cat: Category, level: number = 0) => {
    if (searchLower && !matchesSearch(cat) && !hasMatchingDescendant(cat.id)) {
      return null;
    }

    const children = cats.filter(c => c.parent_id === cat.id);
    const isSelected = selectedId === cat.id;
    const isMatch = searchLower && matchesSearch(cat);

    return (
      <div key={cat.id} className="select-none">
        <div 
          className={`flex items-center px-3 py-[6px] cursor-pointer hover:text-ink text-[13px] border-l-2 transition-colors ${isSelected ? 'border-accent bg-surface-light text-ink' : 'border-transparent text-ink-dim'}`}
          style={{ paddingLeft: `${ level * 16 + 12 }px` }}
          onClick={() => setSelectedId(cat.id)}
        >
          <span className={isMatch ? 'font-medium text-ink' : ''}>{cat.name}</span>
          {cat.status === 'deprecated' && <span className="ml-2 text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full uppercase">Dep</span>}
        </div>
        {children.map(child => renderTree(child, level + 1))}
      </div>
    );
  };

  const recalculateSearchPaths = (categories: Category[]) => {
    const buildPath = (id: string | null, visited = new Set<string>()): string => {
      if (!id || visited.has(id)) return '';
      visited.add(id);
      const cat = categories.find(c => c.id === id);
      if (!cat) return '';
      const parentPath = buildPath(cat.parent_id, visited);
      return parentPath ? `${parentPath}/${cat.name}` : cat.name;
    };
    categories.forEach(c => {
      c.search_path = buildPath(c.id);
    });
  };

  const updateSelectedCat = (updater: (c: Category) => void) => {
    if (!selectedId) return;
    updateData(draft => {
      const idx = draft.categories.findIndex(c => c.id === selectedId);
      if (idx !== -1) {
        updater(draft.categories[idx]);
        recalculateSearchPaths(draft.categories);
      }
    });
  };

  const handleAddCategory = () => {
    const id = `new_cat_${Date.now()}`;
    updateData(draft => {
      const newCat: Category = {
        id,
        name: 'New Category',
        parent_id: selectedId || null,
        search_path: '',
        status: 'active',
        inherit_attributes: true,
        attribute_bindings: []
      };
      draft.categories.push(newCat);
      recalculateSearchPaths(draft.categories);
    });
    setSelectedId(id);
  };

  const handleIdBlur = () => {
    if (!selectedCat || editingId === null || editingId === selectedCat.id) {
      setEditingId(null);
      setDuplicateError(null);
      return;
    }
    
    const isDuplicate = cats.some(c => c.id === editingId);
    if (isDuplicate) {
      setDuplicateError(`ID "${editingId}" is already in use.`);
      return;
    }

    const newId = editingId;
    updateData(draft => {
      const idx = draft.categories.findIndex(c => c.id === selectedCat.id);
      if (idx !== -1) {
        draft.categories[idx].id = newId;
      }
      // Also update parent_ids
      draft.categories.forEach(c => {
        if (c.parent_id === selectedCat.id) c.parent_id = newId;
      });
      recalculateSearchPaths(draft.categories);
    });
    setSelectedId(newId);
    setEditingId(null);
    setDuplicateError(null);
  };

  const handleDeleteCategoryConfirm = () => {
    if (!catToDelete) return;
    updateData(draft => {
      const idx = draft.categories.findIndex(c => c.id === catToDelete);
      if (idx !== -1) {
        draft.categories.splice(idx, 1);
      }
      draft.categories.forEach(c => {
        if (c.parent_id === catToDelete) {
          c.parent_id = null;
        }
      });
      recalculateSearchPaths(draft.categories);
    });
    if (selectedId === catToDelete) setSelectedId(null);
    setCatToDelete(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Categories Tree Sidebar */}
      <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border-subtle bg-bg-base flex flex-col h-1/3 md:h-full overflow-hidden shrink-0">
        <div className="px-4 md:px-5 pt-4 md:pt-5 pb-2">
           <h3 className="text-[11px] uppercase tracking-[1.5px] text-ink-dim flex items-center justify-between mb-3">
             Hierarchy
             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100 text-ink" onClick={handleAddCategory}>
               <Plus className="w-4 h-4" />
             </Button>
           </h3>
           <div className="relative mb-2">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-dim" />
             <Input
               placeholder="Search categories..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-8 h-8 text-[12px] bg-surface-light border-border-subtle"
             />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
           {rootCats.map(c => renderTree(c, 0))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-bg-base overflow-y-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6">
        {selectedCat ? (
          <div className="flex-1 flex flex-col gap-6 max-w-4xl">
             <div className="bg-surface-base rounded-xl border border-border-subtle p-4 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
                   <div className="w-full max-w-xl pr-0 md:pr-6">
                     <Input
                       value={selectedCat.name}
                       onChange={e => updateSelectedCat(c => c.name = e.target.value)}
                       className="text-[24px] md:text-[28px] font-serif text-ink mb-2 font-normal p-0 border-transparent bg-transparent focus:border-accent focus:bg-surface-light h-10 w-full"
                     />
                     <div className="flex flex-col gap-1">
                       <div className="flex flex-wrap items-center gap-2">
                         <span className="text-[12px] text-ink-dim font-mono">ID:</span>
                         <Input 
                           value={editingId !== null ? editingId : selectedCat.id}
                           onChange={e => {
                             setEditingId(e.target.value);
                             setDuplicateError(null);
                           }}
                           onBlur={handleIdBlur}
                           onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                           className={`h-7 text-[12px] font-mono px-2 py-1 w-full max-w-[250px] ${duplicateError ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border-transparent bg-transparent py-0 focus:border-accent focus:bg-surface-light'}`}
                         />
                       </div>
                       {duplicateError && <span className="text-[11px] text-red-500">{duplicateError}</span>}
                     </div>
                   </div>
                   <div className="flex items-center shrink-0 self-end md:self-auto">
                      <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={() => setCatToDelete(selectedCat.id)} 
                       className="text-ink-dim hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                       title="Delete Category"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Status</label>
                     <div className="flex h-[38px] items-center ">
                       <StatusToggle status={selectedCat.status} onChange={(status) => updateSelectedCat(c => c.status = status)} />
                     </div>
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Parent Category</label>
                     <select
                       value={selectedCat.parent_id || ''}
                       onChange={(e) => updateSelectedCat(c => c.parent_id = e.target.value || null)}
                       className="w-full rounded-[6px] border border-border-subtle bg-bg-base text-ink px-3 py-[9px] text-[14px]"
                     >
                       <option value="">(None - Root)</option>
                       {cats.filter(cat => cat.id !== selectedCat.id).map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name} ({cat.id})</option>
                       ))}
                     </select>
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Search Path (Autogenerated)</label>
                     <div className="flex items-center min-h-[38px] px-3 py-2 bg-surface-light border border-border-subtle rounded-md text-[13px] font-mono text-ink-dim select-all">
                       {selectedCat.search_path}
                     </div>
                   </div>
                   <div className="flex flex-col gap-2 col-span-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Aliases</label>
                     <MultiStringInput 
                       value={selectedCat.aliases || []}
                       onChange={(val) => updateSelectedCat(c => c.aliases = val as string[])}
                       placeholder="Add alias... (press Enter or Tab)"
                       isWarning={(alias) => validationIssues.some(issue => issue.code === 'DUPLICATE_ALIAS' && issue.message === `Alias '${String(alias).toLowerCase()}' is used multiple times.`)}
                     />
                   </div>
                </div>
             </div>

             {/* Attribute Bindings */}
             <div className="bg-surface-base rounded-xl border border-border-subtle p-4 md:p-8 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                   <h2 className="text-[11px] uppercase tracking-[1.5px] text-ink-dim">Attribute Bindings</h2>
                   <Button variant="outline" size="sm" onClick={() => updateSelectedCat(c => c.attribute_bindings.push({ key: '', required: false, status: 'active' }))}>
                     <Plus className="w-4 h-4 mr-1 hidden sm:inline" /> Add Binding
                   </Button>
                </div>
                {selectedCat.attribute_bindings.length === 0 ? (
                  <div className="py-8 text-center text-ink-dim text-[13px]">
                    No specific attributes bound to this category.
                  </div>
                ) : (
                  <div className="border border-border-subtle rounded-lg overflow-x-auto mt-2">
                    <div className="min-w-[500px] grid grid-cols-[1.5fr_1fr_2fr_50px] bg-surface-light text-[11px] uppercase tracking-[1px] text-ink-dim p-3 border-b border-border-subtle items-center">
                      <div>Attribute Key</div>
                      <div>Requirement</div>
                      <div className="flex flex-col">
                        <span>Override Allowed Terms</span>
                        <span className="text-[9px] opacity-70 tracking-normal normal-case">For enum attributes, specific terms</span>
                      </div>
                      <div className="text-right">Acts</div>
                    </div>
                    <div className="min-w-[500px] divide-y divide-border-subtle text-[13px] text-ink bg-bg-base">
                      {selectedCat.attribute_bindings.map((b, bIdx) => {
                        const attr = data.attributes.find(a => a.key === b.key);
                        const isVocabEnum = attr && (attr.type === 'enum' || attr.type === 'color') && attr.vocab_ref;
                        return (
                          <div key={bIdx} className="grid grid-cols-[1.5fr_1fr_2fr_50px] p-3 items-center">
                            <div>
                              <select
                                value={b.key}
                                onChange={e => updateSelectedCat(c => c.attribute_bindings[bIdx].key = e.target.value)}
                                className="w-full max-w-[200px] rounded-md border border-border-subtle bg-bg-base text-ink py-1 px-2 focus:ring-accent focus:border-accent text-[13px]"
                              >
                                <option value="" disabled>Select feature...</option>
                                {data.attributes.map(a => (
                                  <option key={a.key} value={a.key}>{a.label} ({a.key})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center text-accent">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={b.required}
                                  onChange={e => updateSelectedCat(c => c.attribute_bindings[bIdx].required = e.target.checked)}
                                  className="rounded border-border-subtle text-accent focus:ring-accent bg-transparent"
                                />
                                {b.required ? 'Required' : <span className="text-ink">Optional</span>}
                              </label>
                            </div>
                            <div className="font-mono text-xs text-accent">
                              {isVocabEnum ? (() => {
                                const vocab = data.vocabularies.find(v => v.id === attr.vocab_ref);
                                if (!vocab) return <span className="text-ink-dim italic">Vocab not found</span>;
                                return (
                                  <div className="max-h-24 overflow-y-auto w-full max-w-[250px] bg-bg-base border border-border-subtle rounded-md p-1.5 flex flex-col gap-1">
                                    {vocab.terms.map(t => (
                                      <label key={t.value} className="flex items-center gap-2 cursor-pointer text-[12px] text-ink font-sans">
                                        <input 
                                          type="checkbox"
                                          className="w-3.5 h-3.5 rounded border-border-subtle text-accent focus:ring-accent"
                                          checked={b.override?.allowed_terms?.includes(t.value) || false}
                                          onChange={(e) => {
                                            updateSelectedCat(c => {
                                              const currentObj = c.attribute_bindings[bIdx];
                                              let current = currentObj.override?.allowed_terms || [];
                                              if (e.target.checked) {
                                                current = [...current, t.value];
                                              } else {
                                                current = current.filter(val => val !== t.value);
                                              }
                                              if (current.length > 0) {
                                                currentObj.override = { allowed_terms: current };
                                              } else {
                                                delete currentObj.override;
                                              }
                                            });
                                          }}
                                        />
                                        <span className="truncate">{t.value}</span>
                                      </label>
                                    ))}
                                  </div>
                                );
                              })() : (
                                <span className="text-ink-dim italic">Not applicable</span>
                              )}
                            </div>
                            <div className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-ink-dim hover:text-red-500 h-8 w-8"
                                onClick={() => updateSelectedCat(c => c.attribute_bindings.splice(bIdx, 1))}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="mt-auto flex gap-3">
                  <label className="flex items-center gap-2 text-[12px] text-ink cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedCat.inherit_attributes}
                      onChange={e => updateSelectedCat(c => c.inherit_attributes = e.target.checked)}
                      className="rounded border-border-subtle text-accent focus:ring-accent bg-transparent"
                    />
                    Inherit Parent Attributes
                  </label>
                </div>
             </div>

          </div>
        ) : (
           <div className="flex-1 flex items-center justify-center text-ink-dim flex-col space-y-4 bg-surface-base rounded-xl border border-border-subtle m-6">
              <FolderOpen className="w-12 h-12 text-border-subtle" />
              <p className="text-[13px]">Select a category from the tree to edit</p>
           </div>
        )}

        {selectedCat && (
          <aside className="w-full xl:w-[240px] shrink-0 xl:border-l border-t xl:border-t-0 border-border-subtle bg-surface-base p-6 rounded-xl xl:rounded-none xl:rounded-r-xl border xl:border-y-0 xl:border-r-0 mt-6 xl:mt-0 xl:h-auto self-start">
            <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Validation</div>
            
            {currentCatIssues.length > 0 ? (
              <div className="space-y-3 mb-6">
                {currentCatIssues.map((issue, idx) => (
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
              <div className="text-[12px] text-ink-dim mb-6">No validation issues specific to this category.</div>
            )}
            
            <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Summary</div>
            <div className="text-[12px] flex flex-col gap-2">
               <div className="flex justify-between">
                 <span className="text-ink-dim">Active Bindings</span>
                 <span className="text-ink">{selectedCat.attribute_bindings.length}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-ink-dim">Inherits Parent</span>
                 <span className="text-ink">{selectedCat.inherit_attributes ? 'True' : 'False'}</span>
               </div>
            </div>
          </aside>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!catToDelete}
        title="Delete Category"
        message={`Are you sure you want to delete category "${catToDelete}"? Child categories will lose their parent.`}
        onConfirm={handleDeleteCategoryConfirm}
        onCancel={() => setCatToDelete(null)}
      />
    </div>
  );
}
