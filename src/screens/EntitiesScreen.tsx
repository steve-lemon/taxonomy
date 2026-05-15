import { useState, useEffect, useMemo } from 'react';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { MultiStringInput } from '../components/MultiStringInput';
import { Status, EntityTypeDefinition, RelationTypeDefinition } from '../types/taxonomy';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Box, Share2, Plus, Trash2, AlertCircle, Search } from 'lucide-react';
import { validateTaxonomy } from '../utils/validation';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { StatusToggle } from '../components/ui/StatusToggle';

import { EntityPreview } from '../components/EntityPreview';

export function EntitiesScreen() {
  const { data, updateData } = useTaxonomyStore();
  const [mode, setMode] = useState<'entities' | 'relations' | 'preview'>('entities');
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [entityToDelete, setEntityToDelete] = useState<string | null>(null);
  const [entitySearchQuery, setEntitySearchQuery] = useState('');

  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);
  const [duplicateRelationError, setDuplicateRelationError] = useState<string | null>(null);
  const [relationToDelete, setRelationToDelete] = useState<string | null>(null);
  const [relationSearchQuery, setRelationSearchQuery] = useState('');

  useEffect(() => {
    setEditingId(null);
    setDuplicateError(null);
  }, [selectedId]);

  useEffect(() => {
    setEditingRelationId(null);
    setDuplicateRelationError(null);
  }, [selectedRelationId]);

  if (!data) return null;

  // Ensure entity_model exists
  const entityTypes = data.entity_model?.entity_types || [];
  const selectedEntity = entityTypes.find(e => e.id === selectedId);
  const entityIndex = entityTypes.findIndex(e => e.id === selectedId);

  const relationTypes = data.entity_model?.relation_types || [];
  const selectedRelation = relationTypes.find(r => r.id === selectedRelationId);
  const relationIndex = relationTypes.findIndex(r => r.id === selectedRelationId);

  // Compute validation errors specifically for the currently selected entity type
  const validationIssues = validateTaxonomy(data);
  const currentEntityIssues = validationIssues.filter(
    issue => issue.path === `entity_model.entity_types[${entityIndex}]` || issue.path?.startsWith(`entity_model.entity_types[${entityIndex}].`)
  );
  
  const currentRelationIssues = validationIssues.filter(
    issue => issue.path === `entity_model.relation_types[${relationIndex}]` || issue.path?.startsWith(`entity_model.relation_types[${relationIndex}].`)
  );

  const updateSelectedEntity = (updater: (e: EntityTypeDefinition) => void) => {
    if (!selectedId) return;
    updateData(draft => {
      if (!draft.entity_model) {
        draft.entity_model = { entity_types: [], relation_types: [] };
      }
      const idx = draft.entity_model.entity_types.findIndex(e => e.id === selectedId);
      if (idx !== -1) {
        updater(draft.entity_model.entity_types[idx]);
      }
    });
  };

  const handleAddEntity = () => {
    const id = `new_entity_${Date.now()}`;
    updateData(draft => {
      if (!draft.entity_model) {
        draft.entity_model = { entity_types: [], relation_types: [] };
      }
      draft.entity_model.entity_types.push({
        id,
        label: 'New Entity',
        status: 'active',
        aliases: []
      });
    });
    setSelectedId(id);
  };

  const handleIdBlur = () => {
    if (!selectedEntity || editingId === null || editingId === selectedEntity.id) {
      setEditingId(null);
      setDuplicateError(null);
      return;
    }

    if (!editingId.trim()) {
      setDuplicateError('Entity ID cannot be empty.');
      return;
    }

    const isDuplicate = entityTypes.some(e => e.id === editingId);
    if (isDuplicate) {
      setDuplicateError(`ID "${editingId}" is already in use.`);
      return;
    }

    const newId = editingId.trim();
    updateData(draft => {
      if (!draft.entity_model) return;
      
      const idx = draft.entity_model.entity_types.findIndex(e => e.id === selectedEntity.id);
      if (idx !== -1) {
        draft.entity_model.entity_types[idx].id = newId;
      }
      
      // Update relations that reference this entity type
      draft.entity_model.relation_types.forEach(r => {
        if (r.from_entity_type === selectedEntity.id) r.from_entity_type = newId;
        if (r.to_entity_type === selectedEntity.id) r.to_entity_type = newId;
      });
    });
    setSelectedId(newId);
    setEditingId(null);
    setDuplicateError(null);
  };

  const handleDeleteEntityConfirm = () => {
    if (!entityToDelete) return;
    updateData(draft => {
      if (!draft.entity_model) return;
      const idx = draft.entity_model.entity_types.findIndex(e => e.id === entityToDelete);
      if (idx !== -1) {
        draft.entity_model.entity_types.splice(idx, 1);
      }
    });
    if (selectedId === entityToDelete) setSelectedId(null);
    setEntityToDelete(null);
  };

  const updateSelectedRelation = (updater: (r: RelationTypeDefinition) => void) => {
    if (!selectedRelationId) return;
    updateData(draft => {
      if (!draft.entity_model) return;
      const idx = draft.entity_model.relation_types.findIndex(r => r.id === selectedRelationId);
      if (idx !== -1) {
        updater(draft.entity_model.relation_types[idx]);
      }
    });
  };

  const handleAddRelation = () => {
    const id = `new_relation_${Date.now()}`;
    updateData(draft => {
      if (!draft.entity_model) {
        draft.entity_model = { entity_types: [], relation_types: [] };
      }
      draft.entity_model.relation_types.push({
        id,
        label: 'New Relation',
        status: 'active',
        from_entity_type: '',
        to_entity_type: '',
        aliases: []
      });
    });
    setSelectedRelationId(id);
    setMode('relations');
  };

  const handleRelationIdBlur = () => {
    if (!selectedRelation || editingRelationId === null || editingRelationId === selectedRelation.id) {
      setEditingRelationId(null);
      setDuplicateRelationError(null);
      return;
    }

    if (!editingRelationId.trim()) {
      setDuplicateRelationError('Relation ID cannot be empty.');
      return;
    }

    const isDuplicate = relationTypes.some(r => r.id === editingRelationId);
    if (isDuplicate) {
      setDuplicateRelationError(`ID "${editingRelationId}" is already in use.`);
      return;
    }

    const newId = editingRelationId.trim();
    updateData(draft => {
      if (!draft.entity_model) return;
      
      const idx = draft.entity_model.relation_types.findIndex(r => r.id === selectedRelation.id);
      if (idx !== -1) {
        draft.entity_model.relation_types[idx].id = newId;
      }
    });
    setSelectedRelationId(newId);
    setEditingRelationId(null);
    setDuplicateRelationError(null);
  };

  const handleDeleteRelationConfirm = () => {
    if (!relationToDelete) return;
    updateData(draft => {
      if (!draft.entity_model) return;
      const idx = draft.entity_model.relation_types.findIndex(r => r.id === relationToDelete);
      if (idx !== -1) {
        draft.entity_model.relation_types.splice(idx, 1);
      }
    });
    if (selectedRelationId === relationToDelete) setSelectedRelationId(null);
    setRelationToDelete(null);
  };

  const relatedFromThis = selectedEntity ? relationTypes.filter(r => r.from_entity_type === selectedEntity.id) : [];
  const relatedToThis = selectedEntity ? relationTypes.filter(r => r.to_entity_type === selectedEntity.id) : [];

  const filteredEntityTypes = useMemo(() => {
    if (!entitySearchQuery.trim()) return entityTypes;
    const lowerQ = entitySearchQuery.toLowerCase();
    return entityTypes.filter(e => 
      e.id.toLowerCase().includes(lowerQ) || 
      e.label.toLowerCase().includes(lowerQ) ||
      (e.aliases || []).some(a => a.toLowerCase().includes(lowerQ))
    );
  }, [entityTypes, entitySearchQuery]);

  const filteredRelationTypes = useMemo(() => {
    if (!relationSearchQuery.trim()) return relationTypes;
    const lowerQ = relationSearchQuery.toLowerCase();
    return relationTypes.filter(r => 
      r.id.toLowerCase().includes(lowerQ) || 
      r.label.toLowerCase().includes(lowerQ) ||
      (r.aliases || []).some(a => a.toLowerCase().includes(lowerQ))
    );
  }, [relationTypes, relationSearchQuery]);

  return (
    <div className="flex flex-col h-full bg-bg-base overflow-hidden">
      {/* Top Tabs Header for Entities Screen */}
      <div className="flex px-4 md:px-6 pt-4 pb-0 border-b border-border-subtle shrink-0">
        <div className="flex gap-6">
          <button 
            className={`pb-3 text-[13px] font-medium transition-colors relative ${mode === 'entities' ? 'text-ink' : 'text-ink-dim hover:text-ink'}`}
            onClick={() => setMode('entities')}
          >
            Entity Types
            {mode === 'entities' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent rounded-t-full" />}
          </button>
          <button 
            className={`pb-3 text-[13px] font-medium transition-colors relative ${mode === 'relations' ? 'text-ink' : 'text-ink-dim hover:text-ink'}`}
            onClick={() => setMode('relations')}
          >
            Relation Types
            {mode === 'relations' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent rounded-t-full" />}
          </button>
          <button 
            className={`pb-3 text-[13px] font-medium transition-colors relative ${mode === 'preview' ? 'text-ink' : 'text-ink-dim hover:text-ink'}`}
            onClick={() => setMode('preview')}
          >
            Preview
            {mode === 'preview' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent rounded-t-full" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar - Hidden in Preview Mode to maximize space */}
        {mode !== 'preview' && (
          <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border-subtle bg-bg-base flex flex-col h-1/3 md:h-full overflow-hidden shrink-0">
            <div className="px-4 md:px-6 pt-4 pb-2 flex items-center justify-between">
               <h3 className="text-[11px] uppercase tracking-[1.5px] text-ink-dim">
                 {mode === 'entities' ? 'Entity Types' : 'Relation Types'}
               </h3>
               <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100 text-ink" onClick={mode === 'entities' ? handleAddEntity : handleAddRelation}>
                 <Plus className="w-4 h-4" />
               </Button>
            </div>
            <div className="px-4 md:px-6 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-dim" />
                <Input
                  placeholder={mode === 'entities' ? 'Search entity types...' : 'Search relation types...'}
                  value={mode === 'entities' ? entitySearchQuery : relationSearchQuery}
                  onChange={e => mode === 'entities' ? setEntitySearchQuery(e.target.value) : setRelationSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-[12px] bg-surface-base"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
               {mode === 'entities' && filteredEntityTypes.length === 0 && (
                 <div className="text-center py-4 text-ink-dim text-[12px]">No entity types found.</div>
               )}
               {mode === 'entities' && filteredEntityTypes.map(e => {
                 const isSelected = selectedId === e.id;
                 return (
                   <div 
                     key={e.id}
                     className={`flex items-center px-6 py-[8px] cursor-pointer hover:text-ink text-[13px] border-l-2 transition-colors ${isSelected ? 'border-accent bg-surface-light text-ink' : 'border-transparent text-ink-dim'}`}
                     onClick={() => setSelectedId(e.id)}
                   >
                     <Box className="w-4 h-4 mr-3 opacity-60 shrink-0" />
                     <span className="truncate">{e.label}</span>
                     {e.status === 'deprecated' && <span className="ml-auto text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full uppercase shrink-0">Dep</span>}
                   </div>
                 );
               })}
               {mode === 'relations' && filteredRelationTypes.length === 0 && (
                 <div className="text-center py-4 text-ink-dim text-[12px]">No relation types found.</div>
               )}
               {mode === 'relations' && filteredRelationTypes.map(r => {
                 const isSelected = selectedRelationId === r.id;
                 return (
                   <div 
                     key={r.id}
                     className={`flex items-center px-6 py-[8px] cursor-pointer hover:text-ink text-[13px] border-l-2 transition-colors ${isSelected ? 'border-accent bg-surface-light text-ink' : 'border-transparent text-ink-dim'}`}
                     onClick={() => setSelectedRelationId(r.id)}
                   >
                     <Share2 className="w-4 h-4 mr-3 opacity-60 shrink-0" />
                     <span className="truncate">{r.label}</span>
                     {r.status === 'deprecated' && <span className="ml-auto text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full uppercase shrink-0">Dep</span>}
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className={`bg-bg-base overflow-y-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6 ${mode === 'preview' ? 'w-full' : 'flex-1'}`}>
        {mode === 'preview' ? (
          <EntityPreview />
        ) : mode === 'entities' ? (
          <>
            {selectedEntity ? (
              <div className="flex-1 flex flex-col gap-6 max-w-4xl">
                 <div className="bg-surface-base rounded-xl border border-border-subtle p-4 md:p-8 flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
                       <div className="w-full max-w-xl pr-0 md:pr-6">
                         <Input
                           value={selectedEntity.label}
                           onChange={e => updateSelectedEntity(ent => ent.label = e.target.value)}
                           className="text-[24px] md:text-[28px] font-serif text-ink mb-2 font-normal p-0 border-transparent bg-transparent focus:border-accent focus:bg-surface-light h-10 w-full"
                           placeholder="Entity Label"
                         />
                         <div className="flex flex-col gap-1">
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="text-[12px] text-ink-dim font-mono">ID:</span>
                             <Input 
                               value={editingId !== null ? editingId : selectedEntity.id}
                               onChange={e => {
                                 setEditingId(e.target.value);
                                 setDuplicateError(null);
                               }}
                               onBlur={handleIdBlur}
                               onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                               className={`h-7 text-[12px] font-mono px-2 py-1 w-full max-w-[250px] ${duplicateError ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border-transparent bg-transparent py-0 focus:border-accent focus:bg-surface-light'}`}
                               placeholder="entity_id"
                             />
                           </div>
                           {duplicateError && <span className="text-[11px] text-red-500">{duplicateError}</span>}
                         </div>
                       </div>
                       <div className="flex items-center shrink-0 self-end md:self-auto">
                          <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => setEntityToDelete(selectedEntity.id)} 
                           className="text-ink-dim hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                           title="Delete Entity Type"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Status</label>
                          <div className="flex h-[38px] items-center ">
                            <StatusToggle status={selectedEntity.status} onChange={(status) => updateSelectedEntity(ent => ent.status = status)} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Aliases</label>
                         <MultiStringInput 
                           value={selectedEntity.aliases || []}
                           onChange={(val) => updateSelectedEntity(ent => ent.aliases = val as string[])}
                           placeholder="Add alias... (press Enter or Tab)"
                           isWarning={(alias) => validationIssues.some(issue => issue.code === 'DUPLICATE_ALIAS' && issue.message === `Alias '${String(alias).toLowerCase()}' is used multiple times.`)}
                         />
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center text-ink-dim flex-col space-y-4 bg-surface-base rounded-xl border border-border-subtle m-6 max-h-[400px]">
                  <Box className="w-12 h-12 text-border-subtle" />
                  <p className="text-[13px]">Select an entity type to edit</p>
               </div>
            )}

            {selectedEntity && (
              <aside className="w-full xl:w-[240px] shrink-0 xl:border-l border-t xl:border-t-0 border-border-subtle bg-surface-base p-6 rounded-xl xl:rounded-none xl:rounded-r-xl border xl:border-y-0 xl:border-r-0 mt-6 xl:mt-0 xl:h-auto self-start">
                <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Summary</div>
                <div className="text-[12px] flex flex-col gap-4">
                   <div className="border-b border-border-subtle pb-4">
                     <div className="text-[11px] uppercase tracking-[1px] text-ink-dim mb-2 mt-4">Outgoing Relations</div>
                     {relatedFromThis.length === 0 ? (
                       <span className="text-ink-dim">No outgoing relations.</span>
                     ) : (
                         <ul className="space-y-1">
                          {relatedFromThis.map(r => (
                            <li key={r.id} className="text-accent font-mono truncate" title={r.id}>{r.id} {'->'} {r.to_entity_type}</li>
                          ))}
                       </ul>
                     )}
                   </div>

                   <div className="border-b border-border-subtle pb-4">
                     <div className="text-[11px] uppercase tracking-[1px] text-ink-dim mb-2 mt-4">Incoming Relations</div>
                     {relatedToThis.length === 0 ? (
                       <span className="text-ink-dim">No incoming relations.</span>
                     ) : (
                       <ul className="space-y-1">
                          {relatedToThis.map(r => (
                            <li key={r.id} className="text-accent font-mono truncate" title={r.id}>{r.from_entity_type} {'->'} {r.id}</li>
                          ))}
                       </ul>
                     )}
                   </div>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Validation</div>
                  
                  {currentEntityIssues.length > 0 ? (
                    <div className="space-y-3 mb-6">
                      {currentEntityIssues.map((issue, idx) => (
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
                    <div className="text-[12px] text-ink-dim mb-6">No validation issues specific to this entity type.</div>
                  )}
                </div>
              </aside>
            )}
          </>
        ) : (
          <>
            {selectedRelation ? (
              <div className="flex-1 flex flex-col gap-6 max-w-4xl">
                 <div className="bg-surface-base rounded-xl border border-border-subtle p-4 md:p-8 flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
                       <div className="w-full max-w-xl pr-0 md:pr-6">
                         <Input
                           value={selectedRelation.label}
                           onChange={e => updateSelectedRelation(r => r.label = e.target.value)}
                           className="text-[24px] md:text-[28px] font-serif text-ink mb-2 font-normal p-0 border-transparent bg-transparent focus:border-accent focus:bg-surface-light h-10 w-full"
                           placeholder="Relation Label"
                         />
                         <div className="flex flex-col gap-1">
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="text-[12px] text-ink-dim font-mono">ID:</span>
                             <Input 
                               value={editingRelationId !== null ? editingRelationId : selectedRelation.id}
                               onChange={e => {
                                 setEditingRelationId(e.target.value);
                                 setDuplicateRelationError(null);
                               }}
                               onBlur={handleRelationIdBlur}
                               onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                               className={`h-7 text-[12px] font-mono px-2 py-1 w-full max-w-[250px] ${duplicateRelationError ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border-transparent bg-transparent py-0 focus:border-accent focus:bg-surface-light'}`}
                               placeholder="relation_id"
                             />
                           </div>
                           {duplicateRelationError && <span className="text-[11px] text-red-500">{duplicateRelationError}</span>}
                         </div>
                       </div>
                       <div className="flex items-center shrink-0 self-end md:self-auto">
                          <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => setRelationToDelete(selectedRelation.id)} 
                           className="text-ink-dim hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                           title="Delete Relation"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                       <div className="flex flex-col gap-2">
                         <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">From Entity Type</label>
                         <select
                           value={selectedRelation.from_entity_type || ''}
                           onChange={(e) => updateSelectedRelation(r => r.from_entity_type = e.target.value)}
                           className="text-[13px] border border-border-subtle bg-surface-light text-ink rounded-md p-2 focus:ring-accent focus:border-accent"
                         >
                           <option value="">Select From Entity...</option>
                           {entityTypes.map(e => (
                             <option key={e.id} value={e.id}>{e.label} ({e.id})</option>
                           ))}
                         </select>
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">To Entity Type</label>
                         <select
                           value={selectedRelation.to_entity_type || ''}
                           onChange={(e) => updateSelectedRelation(r => r.to_entity_type = e.target.value)}
                           className="text-[13px] border border-border-subtle bg-surface-light text-ink rounded-md p-2 focus:ring-accent focus:border-accent"
                         >
                           <option value="">Select To Entity...</option>
                           {entityTypes.map(e => (
                             <option key={e.id} value={e.id}>{e.label} ({e.id})</option>
                           ))}
                         </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 mt-4">
                       <div className="flex flex-col gap-2">
                         <label className="text-[10px] uppercase tracking-[1px] text-ink-dim">Aliases</label>
                         <MultiStringInput 
                           value={selectedRelation.aliases || []}
                           onChange={(val) => updateSelectedRelation(r => r.aliases = val as string[])}
                           placeholder="Add alias... (press Enter or Tab)"
                           isWarning={(alias) => validationIssues.some(issue => issue.code === 'DUPLICATE_ALIAS' && issue.message === `Alias '${String(alias).toLowerCase()}' is used multiple times.`)}
                         />
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
               <div className="flex-1 flex items-center justify-center text-ink-dim flex-col space-y-4 bg-surface-base rounded-xl border border-border-subtle m-6 max-h-[400px]">
                  <Share2 className="w-12 h-12 text-border-subtle" />
                  <p className="text-[13px]">Select a relation type to edit</p>
               </div>
            )}

            {selectedRelation && (
              <aside className="w-full xl:w-[240px] shrink-0 xl:border-l border-t xl:border-t-0 border-border-subtle bg-surface-base p-6 rounded-xl xl:rounded-none xl:rounded-r-xl border xl:border-y-0 xl:border-r-0 mt-6 xl:mt-0 xl:h-auto self-start">
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-[1.5px] text-ink-dim mb-4">Validation</div>
                  
                  {currentRelationIssues.length > 0 ? (
                    <div className="space-y-3 mb-6">
                      {currentRelationIssues.map((issue, idx) => (
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
                    <div className="text-[12px] text-ink-dim mb-6">No validation issues specific to this relation type.</div>
                  )}
                </div>
              </aside>
            )}
          </>
        )}
      </div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!entityToDelete}
        title="Delete Entity"
        message={`Are you sure you want to delete entity type "${entityToDelete}"? Make sure to remove associated relations.`}
        onConfirm={handleDeleteEntityConfirm}
        onCancel={() => setEntityToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={!!relationToDelete}
        title="Delete Relation"
        message={`Are you sure you want to delete relation type "${relationToDelete}"?`}
        onConfirm={handleDeleteRelationConfirm}
        onCancel={() => setRelationToDelete(null)}
      />
    </div>
  );
}
