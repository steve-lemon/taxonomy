import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { Category, Attribute, AttributeBinding } from '../types/taxonomy';
import { Box, HelpCircle, X, Search, ChevronDown } from 'lucide-react';
import { Input } from './ui/Input';
import { ColorInput } from './ui/ColorInput';
import { MultiStringInput } from './MultiStringInput';

export function EntityPreview() {
  const { data } = useTaxonomyStore();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [entityValues, setEntityValues] = useState<Record<string, any>>({});
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!data) return null;

  const strategy = data.rules?.multi_category?.attribute_merge_strategy || 'union';
  const maxCategories = data.rules?.multi_category?.max_categories_per_photo || 3;

  const addCategory = (id: string) => {
    setSelectedCategoryIds(prev => {
      if (prev.length >= maxCategories) return prev;
      return [...prev, id];
    });
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const removeCategory = (id: string) => {
    setSelectedCategoryIds(prev => prev.filter(c => c !== id));
  };

  const searchLower = searchTerm.toLowerCase();
  const filteredCategories = data.categories.filter(cat => {
    if (selectedCategoryIds.includes(cat.id)) return false;
    if (!searchLower) return true;
    if (cat.name.toLowerCase().includes(searchLower)) return true;
    if (cat.aliases?.some(alias => alias.toLowerCase().includes(searchLower))) return true;
    return false;
  });

  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsDropdownOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredCategories.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
      e.preventDefault();
      addCategory(filteredCategories[highlightedIndex].id);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Resolve inherited attribute bindings for a single category
  const resolveCategoryBindings = (categoryId: string): AttributeBinding[] => {
    const bindings = new Map<string, AttributeBinding>();
    let currentId: string | null = categoryId;

    while (currentId) {
      const cat = data.categories.find(c => c.id === currentId);
      if (!cat) break;

      for (const b of cat.attribute_bindings || []) {
        if (!bindings.has(b.key)) {
          bindings.set(b.key, b);
        }
      }

      if (cat.inherit_attributes && cat.parent_id) {
        currentId = cat.parent_id;
      } else {
        break;
      }
    }
    return Array.from(bindings.values());
  };

  const getEffectiveAttributes = () => {
    if (selectedCategoryIds.length === 0) return [];

    const categoryBindings = selectedCategoryIds.map(id => resolveCategoryBindings(id));

    const allKeys = new Set<string>();
    categoryBindings.forEach(bindings => {
      bindings.forEach(b => allKeys.add(b.key));
    });

    const result: Array<{
      key: string;
      attribute: Attribute;
      required: boolean;
      allowed_terms: string[] | undefined;
    }> = [];

    for (const key of allKeys) {
      const attr = data.attributes.find(a => a.key === key);
      if (!attr) continue;

      let include = false;
      let required = false;
      let allowedTerms: Set<string> | null = null;
      
      const bindingsWithKey = categoryBindings.map(bindings => bindings.find(b => b.key === key));

      if (strategy === 'union') {
        include = bindingsWithKey.some(b => !!b);
        required = bindingsWithKey.some(b => b?.required);
        
        if (include) {
         bindingsWithKey.forEach(b => {
           if (b?.override?.allowed_terms) {
             if (allowedTerms === null) allowedTerms = new Set();
             b.override.allowed_terms.forEach(t => allowedTerms!.add(t));
           }
         });
        }
      } else if (strategy === 'intersection') {
        include = bindingsWithKey.every(b => !!b);
        if (include) {
          required = bindingsWithKey.some(b => b?.required);
          bindingsWithKey.forEach(b => {
             if (b?.override?.allowed_terms) {
               if (allowedTerms === null) allowedTerms = new Set(b.override.allowed_terms);
               else {
                 allowedTerms = new Set([...allowedTerms].filter(x => b.override!.allowed_terms!.includes(x)));
               }
             }
          });
        }
      } else if (strategy === 'priority') {
        include = bindingsWithKey.some(b => !!b);
        if (include) {
           const primaryBinding = bindingsWithKey.find(b => !!b);
           if (primaryBinding) {
             required = primaryBinding.required;
             if (primaryBinding.override?.allowed_terms) {
               allowedTerms = new Set(primaryBinding.override.allowed_terms);
             }
           }
        }
      }

      if (include) {
        result.push({
          key,
          attribute: attr,
          required,
          allowed_terms: allowedTerms ? Array.from(allowedTerms) : undefined
        });
      }
    }

    return result;
  };

  const effectiveAttributes = getEffectiveAttributes().sort((a, b) => {
    const pA = a.attribute.priority ?? 9999;
    const pB = b.attribute.priority ?? 9999;
    if (pA !== pB) return pA - pB;
    return a.attribute.label.localeCompare(b.attribute.label);
  });

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full">
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <div className="bg-surface-base rounded-xl border border-border-subtle p-6 md:p-8 flex flex-col gap-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-serif text-ink mb-1">Entity Preview (Runtime Assignment)</h2>
            <p className="text-[13px] text-ink-dim leading-relaxed">
              Test the effective attributes of a virtual entity by assigning up to {maxCategories} categories.
              The current active merge strategy is <strong className="text-accent">{strategy}</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-4 relative" ref={dropdownRef}>
            <label className="text-[11px] uppercase tracking-[1.5px] text-ink-dim hover:text-ink cursor-pointer flex justify-between items-center">
              Select Categories ({selectedCategoryIds.length}/{maxCategories})
            </label>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedCategoryIds.map(id => {
                const cat = data.categories.find(c => c.id === id);
                if (!cat) return null;
                return (
                  <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium bg-accent/10 border border-accent/20 text-accent">
                    {cat.name}
                    <button onClick={() => removeCategory(id)} className="opacity-70 hover:opacity-100 hover:text-red-500 focus:outline-none">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-ink-dim" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleKeyDown}
                  disabled={selectedCategoryIds.length >= maxCategories}
                  placeholder={selectedCategoryIds.length >= maxCategories ? "Maximum categories reached" : "Type to search categories by name or aliases..."}
                  className="pl-9 w-full bg-surface-light border-border-subtle"
                />
              </div>
              
              {isDropdownOpen && selectedCategoryIds.length < maxCategories && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface-base border border-border-subtle rounded-md shadow-lg z-20">
                  {filteredCategories.length === 0 ? (
                    <div className="p-3 text-[13px] text-ink-dim text-center">No matching categories found.</div>
                  ) : (
                    filteredCategories.map((cat, index) => (
                      <div 
                        key={cat.id}
                        onClick={() => addCategory(cat.id)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`px-4 py-2 cursor-pointer border-b border-border-subtle last:border-0 flex flex-col gap-0.5 ${
                          highlightedIndex === index ? 'bg-surface-light border-l-2 border-l-accent' : 'hover:bg-surface-light border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className="text-[13px] text-ink font-medium">{cat.name}</div>
                        {cat.aliases && cat.aliases.length > 0 && (
                          <div className="text-[11px] text-ink-dim flex items-center gap-1">
                            <span className="bg-bg-base px-1 rounded border border-border-subtle">Aliases:</span>
                            {cat.aliases.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-border-subtle">
             <div className="flex justify-between items-center mb-4">
               <label className="text-[11px] uppercase tracking-[1.5px] text-ink-dim flex items-center gap-2">
                 Effective Attributes Input Preview
                 <div className="group relative">
                   <HelpCircle className="w-3.5 h-3.5 text-accent opacity-80" />
                   <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-ink text-surface-base text-[11px] rounded shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all pointer-events-none z-10 font-normal normal-case tracking-normal">
                     {strategy === 'union' && 'Attributes from ANY selected category are included.'}
                     {strategy === 'intersection' && 'Only attributes present in ALL selected categories are included.'}
                     {strategy === 'priority' && 'Attributes are merged, but conflicts (required/allowed terms) follow the first selected category.'}
                   </div>
                 </div>
               </label>
             </div>

             {selectedCategoryIds.length === 0 ? (
               <div className="py-8 text-center text-ink-dim border-2 border-dashed border-border-subtle rounded-xl bg-bg-base text-[13px]">
                 Select categories to preview and input effective attributes.
               </div>
             ) : effectiveAttributes.length === 0 ? (
               <div className="py-8 text-center text-ink-dim border-2 border-dashed border-border-subtle rounded-xl bg-bg-base text-[13px]">
                 No attributes available for the selected combination.
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {effectiveAttributes.map(({ key, attribute, required, allowed_terms }) => {
                 
                 let vocabTerms: {value: string, aliases?: string[], color_code?: string}[] = [];
                 let vocabType = 'string';
                 if ((attribute.type === 'enum' || attribute.type === 'color') && attribute.vocab_ref) {
                   const vocab = data.vocabularies.find(v => v.id === attribute.vocab_ref);
                   if (vocab) {
                     vocabTerms = vocab.terms;
                     if (vocab.type) vocabType = vocab.type;
                   }
                 }

                 const availableTerms = allowed_terms 
                   ? vocabTerms.filter(t => allowed_terms.includes(t.value)) 
                   : vocabTerms;

                 return (
                   <div key={key} className="flex flex-col gap-2 p-4 bg-surface-light border border-border-subtle rounded-lg focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
                     <div className="flex items-center gap-2">
                       <span className="text-[13px] font-medium text-ink flex items-center gap-2">
                         {attribute.label}
                         {required && <span className="text-[10px] text-red-500 font-bold uppercase">*</span>}
                       </span>
                       <span className="text-[10px] font-mono text-ink-dim ml-auto bg-bg-base px-1 py-0.5 rounded border border-border-subtle">
                         {attribute.type} {attribute.cardinality === 'multi' && '[]'}
                       </span>
                     </div>
                     {attribute.hint && (
                       <p className="text-[11px] text-ink-dim/80">{attribute.hint}</p>
                     )}
                     
                     <div className="mt-1">
                       {(attribute.type === 'enum' || (attribute.type === 'color' && attribute.vocab_ref)) ? (
                           <div className="flex flex-wrap gap-2">
                             {availableTerms.map(term => {
                               const isSelected = attribute.cardinality === 'multi' 
                                 ? (entityValues[key] || []).includes(term.value)
                                 : entityValues[key] === term.value;
                               
                               return (
                                 <button
                                   key={term.value}
                                   className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                                     isSelected 
                                       ? 'border-accent bg-accent/10 text-accent' 
                                       : 'border-border-subtle bg-bg-base text-ink hover:border-ink-dim'
                                   }`}
                                   onClick={() => {
                                     setEntityValues(prev => {
                                       if (attribute.cardinality === 'multi') {
                                         const arr = prev[key] || [];
                                         if (arr.includes(term.value)) {
                                           return { ...prev, [key]: arr.filter((v: string) => v !== term.value) };
                                         }
                                         return { ...prev, [key]: [...arr, term.value] };
                                       }
                                       return { ...prev, [key]: isSelected ? '' : term.value };
                                     });
                                   }}
                                 >
                                   {vocabType === 'color' && (
                                     <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: term.color_code || '#ccc' }}></span>
                                   )}
                                   {term.value}
                                 </button>
                               );
                             })}
                           </div>
                       ) : attribute.type === 'boolean' ? (
                         <div className="flex items-center gap-2 h-9">
                           <input 
                             type="checkbox" 
                             className="w-4 h-4 rounded border-border-subtle text-accent focus:ring-accent bg-bg-base"
                             checked={!!entityValues[key]}
                             onChange={(e) => setEntityValues(prev => ({ ...prev, [key]: e.target.checked }))}
                           />
                           <span className="text-[13px] text-ink-dim">Yes / True</span>
                         </div>
                       ) : attribute.type === 'date' ? (
                         <input
                           type="date"
                           className="w-full bg-bg-base border border-border-subtle text-ink rounded-md p-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                           value={entityValues[key] || ''}
                           onChange={(e) => setEntityValues(prev => ({ ...prev, [key]: e.target.value }))}
                         />
                       ) : attribute.type === 'number' ? (
                         attribute.cardinality === 'multi' ? (
                           <MultiStringInput
                             type="number"
                             placeholder="Type and press Enter, Tab or comma..."
                             value={entityValues[key] || []}
                             onChange={(val) => setEntityValues(prev => ({ ...prev, [key]: val }))}
                           />
                         ) : (
                           <input
                             type="number"
                             step="any"
                             className="w-full bg-bg-base border border-border-subtle text-ink rounded-md p-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                             placeholder={`Enter number...`}
                             value={entityValues[key] || ''}
                             onChange={(e) => setEntityValues(prev => ({ ...prev, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                           />
                         )
                       ) : (attribute.type as string) === 'color' ? (

                         <ColorInput 

                           value={entityValues[key] || ''}

                           onChange={(val) => setEntityValues(prev => ({ ...prev, [key]: val }))}

                         />

                       ) : attribute.cardinality === 'multi' ? (
                         <MultiStringInput
                           type={attribute.type === 'email' ? 'email' : attribute.type === 'url' ? 'url' : 'text'}
                           placeholder="Type and press Enter, Tab or comma..."
                           value={entityValues[key] || []}
                           onChange={(val) => setEntityValues(prev => ({ ...prev, [key]: val }))}
                           isWarning={(val) => {
                             if (attribute.type === 'email') return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val));
                             if (attribute.type === 'url') return !/^(https?:\/\/)[\w.-]+\.[a-z]{2,}/i.test(String(val));
                             return false;
                           }}
                         />
                       ) : (
                         <div className="relative">
                           <input 
                             type={attribute.type === 'email' ? 'email' : attribute.type === 'url' ? 'url' : 'text'}
                             className={`w-full bg-bg-base border ${
                               (entityValues[key] && attribute.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entityValues[key])) ||
                               (entityValues[key] && attribute.type === 'url' && !/^(https?:\/\/)[\w.-]+\.[a-z]{2,}/i.test(entityValues[key]))
                                 ? 'border-orange-500/50 text-orange-600 focus:ring-orange-500' 
                                 : 'border-border-subtle text-ink focus:ring-accent'
                             } rounded-md p-2 text-[13px] focus:outline-none focus:ring-1`}
                             placeholder="Enter value..."
                             value={entityValues[key] || ''}
                             onChange={(e) => {
                               const val = e.target.value;
                               setEntityValues(prev => ({ ...prev, [key]: val }));
                             }}
                           />
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      </div>
      </div>
      
      <div className="w-full xl:w-[320px] 2xl:w-[400px] flex flex-col gap-6 shrink-0">
        <div className="bg-surface-base rounded-xl border border-border-subtle p-5 md:p-6 sticky top-6 shadow-sm">
          <h3 className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">JSON Preview</h3>
          <div className="bg-[#1e1e1e] rounded-md border border-black/20 p-4 overflow-x-auto text-[12px] font-mono leading-relaxed shadow-inner">
            <pre className="text-[#d4d4d4]">
              {JSON.stringify({
                categories: selectedCategoryIds,
                attributes: entityValues
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

