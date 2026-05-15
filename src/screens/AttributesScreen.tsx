import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { Status, Attribute } from '../types/taxonomy';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tags, Plus, Trash2, AlertCircle, GripVertical, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { validateTaxonomy } from '../utils/validation';
import { MultiStringInput } from '../components/MultiStringInput';
import EmojiPicker from 'emoji-picker-react';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { StatusToggle } from '../components/ui/StatusToggle';

export function AttributesScreen() {
  const { data, updateData } = useTaxonomyStore();
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [attrToDelete, setAttrToDelete] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
    if (!data) return;
    let modified = false;
    const newAttrs = [...data.attributes];
    const maxP = newAttrs.reduce((max, a) => Math.max(max, a.priority ?? 0), 0);
    let nextP = maxP === 0 ? 1 : maxP + 1;
    newAttrs.forEach((a) => {
      if (a.priority === undefined) {
        a.priority = nextP++;
        modified = true;
      }
    });
    if (modified) {
      updateData(draft => {
        draft.attributes.forEach((draftA) => {
           if (draftA.priority === undefined) {
              const matched = newAttrs.find(n => n.key === draftA.key);
              if (matched) draftA.priority = matched.priority;
           }
        });
      });
    }
  }, [data, updateData]);

  useEffect(() => {
    setEditingKey(null);
    setDuplicateError(null);
  }, [selectedKey]);

  if (!data) return null;

  const attributes = data.attributes;
  const selectedAttr = attributes.find(a => a.key === selectedKey);
  const attrIndex = attributes.findIndex(a => a.key === selectedKey);

  // Compute validation errors specifically for the currently selected attribute
  const validationIssues = validateTaxonomy(data);

  const sortedAttributes = [...attributes].sort((a,b) => (a.priority ?? 9999) - (b.priority ?? 9999));

  const reorderAttributes = (fromIndex: number, toIndex: number) => {
    updateData(draft => {
      draft.attributes.sort((a,b) => (a.priority ?? 9999) - (b.priority ?? 9999));
      const [moved] = draft.attributes.splice(fromIndex, 1);
      draft.attributes.splice(toIndex, 0, moved);
      draft.attributes.forEach((attr, idx) => {
        attr.priority = idx + 1;
      });
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be captured before we grey out the source
    setTimeout(() => setDraggedIndex(index), 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderAttributes(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const currentAttrIssues = validationIssues.filter(
    issue => issue.path === `attributes[${attrIndex}]` || issue.path?.startsWith(`attributes[${attrIndex}].`)
  );

  const updateSelectedAttr = (updater: (a: Attribute) => void) => {
    if (!selectedKey) return;
    updateData(draft => {
      const idx = draft.attributes.findIndex(a => a.key === selectedKey);
      if (idx !== -1) {
        updater(draft.attributes[idx]);
      }
    });
  };

  const handleAddAttribute = () => {
    const key = `new_attr_${Date.now()}`;
    updateData(draft => {
      draft.attributes.push({
        key,
        label: 'New Attribute',
        type: 'string',
        cardinality: 'single',
        status: 'active'
      });
    });
    setSelectedKey(key);
  };

  const handleKeyBlur = () => {
    if (!selectedAttr || editingKey === null || editingKey === selectedAttr.key) {
      setEditingKey(null);
      setDuplicateError(null);
      return;
    }

    if (!editingKey.trim()) {
      setDuplicateError('Attribute key cannot be empty.');
      return;
    }

    const isDuplicate = attributes.some(a => a.key === editingKey);
    if (isDuplicate) {
      setDuplicateError(`Key "${editingKey}" is already in use.`);
      return;
    }

    const newKey = editingKey.trim();
    updateData(draft => {
      const idx = draft.attributes.findIndex(a => a.key === selectedAttr.key);
      if (idx !== -1) {
        draft.attributes[idx].key = newKey;
      }
      
      // Update categories that reference this attribute
      draft.categories.forEach(c => {
        c.attribute_bindings.forEach(b => {
          if (b.key === selectedAttr.key) {
            b.key = newKey;
          }
        });
      });
    });
    setSelectedKey(newKey);
    setEditingKey(null);
    setDuplicateError(null);
  };

  const handleDeleteAttributeConfirm = () => {
    if (!attrToDelete) return;
    updateData(draft => {
      const idx = draft.attributes.findIndex(a => a.key === attrToDelete);
      if (idx !== -1) {
        draft.attributes.splice(idx, 1);
      }
      
      draft.categories.forEach(c => {
        c.attribute_bindings = c.attribute_bindings.filter(b => b.key !== attrToDelete);
      });
    });
    if (selectedKey === attrToDelete) setSelectedKey(null);
    setAttrToDelete(null);
  };

  // Find categories using this attribute
  const categoriesUsingAttr = selectedAttr 
    ? data.categories.filter(c => c.attribute_bindings.some(b => b.key === selectedAttr.key))
    : [];

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border-subtle bg-bg-base flex flex-col h-1/3 md:h-full overflow-hidden shrink-0">
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
           <h3 className="text-[11px] uppercase tracking-[1.5px] text-ink-dim flex items-center justify-between mb-2">
             Attributes
             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100 text-ink" onClick={handleAddAttribute}>
               <Plus className="w-4 h-4" />
             </Button>
           </h3>
        </div>
        <div className="flex-1 overflow-y-auto py-2 pr-2">
           {sortedAttributes.map((a, index) => {
             const isSelected = selectedKey === a.key;
             const isDragOver = dragOverIndex === index;
             const isDragging = draggedIndex === index;
             return (
               <div 
                 key={a.key}
                 draggable
                 onDragStart={(e) => handleDragStart(e, index)}
                 onDragEnter={(e) => handleDragEnter(e, index)}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => handleDrop(e, index)}
                 onDragEnd={handleDragEnd}
                 className={`flex items-center px-3 py-[6px] cursor-pointer hover:text-ink text-[13px] border-l-2 transition-colors relative ${isSelected ? 'border-accent bg-surface-light text-ink' : 'border-transparent text-ink-dim hover:bg-surface-light'} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-t-2 border-t-accent' : ''}`}
                 onClick={() => setSelectedKey(a.key)}
               >
                 <GripVertical className="w-3.5 h-3.5 mr-1.5 opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                 <span className="w-6 text-[10px] font-mono text-ink-dim">{a.priority ?? '-'}</span>
                 <span className="mr-2 text-base leading-none">{a.icon || '📌'}</span>
                 <span className="truncate flex-1">{a.label}</span>
                 
                 {isSelected && (
                   <div className="flex items-center ml-2 bg-bg-base border border-border-subtle rounded shadow-sm opacity-80 hover:opacity-100 shrink-0">
                     <button
                       onClick={(e) => { e.stopPropagation(); if (index > 0) reorderAttributes(index, 0); }}
                       className="p-0.5 hover:bg-surface-light hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                       title="Move to Top"
                       disabled={index === 0}
                     >
                       <ChevronsUp className="w-3 h-3" />
                     </button>
                     <button
                       onClick={(e) => { e.stopPropagation(); if (index > 0) reorderAttributes(index, index - 1); }}
                       className="p-0.5 hover:bg-surface-light hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent border-l border-border-subtle"
                       title="Move Up"
                       disabled={index === 0}
                     >
                       <ChevronUp className="w-3 h-3" />
                     </button>
                     <button
                       onClick={(e) => { e.stopPropagation(); if (index < sortedAttributes.length - 1) reorderAttributes(index, index + 1); }}
                       className="p-0.5 hover:bg-surface-light hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent border-l border-border-subtle"
                       title="Move Down"
                       disabled={index === sortedAttributes.length - 1}
                     >
                       <ChevronDown className="w-3 h-3" />
                     </button>
                     <button
                       onClick={(e) => { e.stopPropagation(); if (index < sortedAttributes.length - 1) reorderAttributes(index, sortedAttributes.length - 1); }}
                       className="p-0.5 hover:bg-surface-light hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent border-l border-border-subtle"
                       title="Move to Bottom"
                       disabled={index === sortedAttributes.length - 1}
                     >
                       <ChevronsDown className="w-3 h-3" />
                     </button>
                   </div>
                 )}
                 {a.status === 'deprecated' && !isSelected && <span className="ml-2 text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase shrink-0">Dep</span>}
               </div>
             );
           })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-bg-base overflow-y-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6">
        {selectedAttr ? (
          <div className="flex-1 flex flex-col gap-6 max-w-4xl">
             <div className="bg-surface-base rounded-xl border border-border-subtle p-4 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
                   <div className="flex w-full">
                     <div className="relative shrink-0 mr-4">
                       <button
                         onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                         className="w-12 h-12 flex items-center justify-center text-2xl border border-border-subtle rounded-xl bg-surface-light hover:bg-surface-base transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                         title="Select Icon"
                       >
                         {selectedAttr.icon || '📌'}
                       </button>
                       {showEmojiPicker && (
                         <div className="absolute top-full left-0 mt-2 z-50 shadow-2xl">
                           <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)}></div>
                           <div className="relative">
                             <EmojiPicker onEmojiClick={(e) => {
                               updateSelectedAttr(a => a.icon = e.emoji);
                               setShowEmojiPicker(false);
                             }} width={300} height={400} />
                           </div>
                         </div>
                       )}
                     </div>
                     <div className="w-full max-w-xl pr-0 md:pr-6">
                       <Input
                         value={selectedAttr.label}
                         onChange={e => updateSelectedAttr(a => a.label = e.target.value)}
                         className="text-[24px] md:text-[28px] font-serif text-ink mb-2 font-normal p-0 border-transparent bg-transparent focus:border-accent focus:bg-surface-light h-10 w-full"
                         placeholder="Attribute Label"
                       />
                       <div className="flex flex-col gap-1">
                         <div className="flex flex-wrap items-center gap-2">
                           <span className="text-[12px] text-ink-dim font-mono">Key:</span>
                           <Input 
                             value={editingKey !== null ? editingKey : selectedAttr.key}
                             onChange={e => {
                               setEditingKey(e.target.value);
                               setDuplicateError(null);
                             }}
                             onBlur={handleKeyBlur}
                             onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                             className={`h-7 text-[12px] font-mono px-2 py-1 w-full max-w-[250px] ${duplicateError ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border-transparent bg-transparent py-0 focus:border-accent focus:bg-surface-light'}`}
                             placeholder="attribute_key"
                           />
                         </div>
                         {duplicateError && <span className="text-[11px] text-red-500">{duplicateError}</span>}
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center shrink-0 self-end md:self-auto">
                      <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={() => setAttrToDelete(selectedAttr.key)} 
                       className="text-ink-dim hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                       title="Delete Attribute"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Status</label>
                     <div className="flex h-[38px] items-center ">
                       <StatusToggle status={selectedAttr.status} onChange={(status) => updateSelectedAttr(a => a.status = status)} />
                     </div>
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Type</label>
                     <select
                       value={selectedAttr.type}
                       onChange={(e) => updateSelectedAttr(a => {
                         const newType = e.target.value as Attribute['type'];
                         a.type = newType;
                         if (newType !== 'enum') {
                           delete a.vocab_ref;
                         }
                       })}
                       className="w-full rounded-[6px] border border-border-subtle bg-bg-base text-ink px-3 py-[9px] text-[14px]"
                     >
                       <option value="string">String</option>
                       <option value="number">Number</option>
                       <option value="boolean">Boolean</option>
                       <option value="date">Date</option>
                       <option value="enum">Enum</option>
                       <option value="color">Color</option>
                       <option value="email">Email</option>
                       <option value="url">URL</option>
                     </select>
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Cardinality</label>
                     <select
                       value={selectedAttr.cardinality}
                       onChange={(e) => updateSelectedAttr(a => a.cardinality = e.target.value as Attribute['cardinality'])}
                       className="w-full rounded-[6px] border border-border-subtle bg-bg-base text-ink px-3 py-[9px] text-[14px]"
                     >
                       <option value="single">Single</option>
                       <option value="multi">Multi</option>
                     </select>
                   </div>
                   
                   <div className="flex flex-col gap-2">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Priority (Lower is higher)</label>
                     <Input
                       type="number"
                       value={selectedAttr.priority ?? ''}
                       onChange={(e) => updateSelectedAttr(a => a.priority = e.target.value ? parseInt(e.target.value, 10) : undefined)}
                       className="w-full rounded-[6px] border border-border-subtle bg-bg-base text-ink px-3 py-2 text-[14px]"
                       placeholder="e.g. 10"
                     />
                   </div>
                   
                   {(selectedAttr.type === 'enum' || selectedAttr.type === 'color') && (
                     <div className="flex flex-col gap-2 col-span-2">
                       <label className="flex items-center text-[10px] uppercase tracking-[1px] text-ink-dim">
                         Vocabulary Reference <span className="ml-1 text-accent">*</span>
                       </label>
                       <select
                         value={selectedAttr.vocab_ref || ''}
                         onChange={(e) => updateSelectedAttr(a => a.vocab_ref = e.target.value)}
                         className={`w-full rounded-[6px] border ${!selectedAttr.vocab_ref ? 'border-red-500/50 focus:border-red-500' : 'border-border-subtle focus:border-accent'} bg-bg-base text-ink px-3 py-[9px] text-[14px]`}
                       >
                         <option value="" disabled>Select a vocabulary...</option>
                         {data.vocabularies.filter(v => selectedAttr.type === 'color' ? v.type === 'color' : (!v.type || v.type === 'string')).map(v => (
                           <option key={v.id} value={v.id}>{v.id} ({v.terms.length} terms)</option>
                         ))}
                       </select>
                       {!selectedAttr.vocab_ref && (
                         <span className="text-[11px] text-red-500">Vocabulary reference is required for {selectedAttr.type} types.</span>
                       )}
                       {selectedAttr.vocab_ref && (() => {
                         const vocab = data.vocabularies.find(v => v.id === selectedAttr.vocab_ref);
                         if (!vocab) return null;
                         return (
                           <div className="mt-2 bg-surface-light border border-border-subtle rounded-md p-3">
                             <span className="block text-[11px] uppercase tracking-[1px] text-ink-dim font-bold mb-2">Available terms</span>
                             <div className="flex flex-wrap gap-2">
                               {vocab.terms.map((term, i) => (
                                 <div key={i} className="flex items-center gap-1.5 bg-bg-base px-2 py-1 rounded border border-border-subtle text-[12px]">
                                   {(term.color_code || vocab.type === 'color') && (
                                     <span 
                                       className="w-3 h-3 rounded-full shrink-0 border border-border-subtle" 
                                       style={{ backgroundColor: term.color_code || '#cccccc' }} 
                                     />
                                   )}
                                   <span>{term.value}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         );
                       })()}
                     </div>
                   )}

                   <div className="flex flex-col gap-2 col-span-2 mt-4">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Aliases</label>
                     <MultiStringInput 
                       value={selectedAttr.aliases || []}
                       onChange={(val) => updateSelectedAttr(a => a.aliases = val as string[])}
                       placeholder="Add alias... (press Enter or Tab)"
                       isWarning={(alias) => validationIssues.some(issue => issue.code === 'DUPLICATE_ALIAS' && issue.message === `Alias '${String(alias).toLowerCase()}' is used multiple times.`)}
                     />
                   </div>

                   <div className="flex flex-col gap-2 col-span-2 mt-4">
                     <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Hint</label>
                     <Input 
                       value={selectedAttr.hint || ''} 
                       onChange={(e) => updateSelectedAttr(a => a.hint = e.target.value)} 
                       className="w-full text-[13px] h-9"
                       placeholder="Provide a hint for data entry..."
                     />
                   </div>
                </div>
             </div>
          </div>
        ) : (
           <div className="flex-1 flex items-center justify-center text-ink-dim flex-col space-y-4 bg-surface-base rounded-xl border border-border-subtle m-6">
              <Tags className="w-12 h-12 text-border-subtle" />
              <p className="text-[13px]">Select an attribute to edit</p>
           </div>
        )}

        {selectedAttr && (
          <aside className="w-full xl:w-[240px] shrink-0 xl:border-l border-t xl:border-t-0 border-border-subtle bg-surface-base p-6 rounded-xl xl:rounded-none xl:rounded-r-xl border xl:border-y-0 xl:border-r-0 mt-6 xl:mt-0 xl:h-auto self-start">
            <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Summary</div>
            <div className="text-[12px] flex flex-col gap-4">
               <div className="border-b border-border-subtle pb-4">
                 <div className="text-[11px] uppercase tracking-[1px] text-ink-dim mb-2">Used In Categories</div>
                 {categoriesUsingAttr.length === 0 ? (
                   <span className="text-ink-dim">Not bound to any category.</span>
                 ) : (
                   <ul className="space-y-1">
                      {categoriesUsingAttr.map(cat => (
                        <li key={cat.id}>
                          <button
                            className="text-accent text-[12px] hover:underline text-left"
                            onClick={() => navigate('/categories', { state: { selectedId: cat.id } })}
                          >
                            {cat.search_path || cat.name}
                          </button>
                        </li>
                      ))}
                   </ul>
                 )}
               </div>
            </div>
            
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Validation</div>
              
              {currentAttrIssues.length > 0 ? (
                <div className="space-y-3">
                  {currentAttrIssues.map((issue, idx) => (
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
                <div className="text-[12px] text-ink-dim mb-6">No validation issues specific to this attribute.</div>
              )}
            </div>
          </aside>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!attrToDelete}
        title="Delete Attribute"
        message={`Are you sure you want to delete attribute "${attrToDelete}"? Categories binding to this attribute will have the binding removed.`}
        onConfirm={handleDeleteAttributeConfirm}
        onCancel={() => setAttrToDelete(null)}
      />
    </div>
  );
}
