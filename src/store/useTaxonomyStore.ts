import { create } from 'zustand';
import { TaxonomyFile } from '../types/taxonomy';
import { loadJson, saveJson, listBundles, renameBundle } from '../services/api';
import { validateTaxonomy } from '../utils/validation';

export type Theme = 'light' | 'dark';

interface TaxonomyState {
  // App state
  inited: boolean;
  theme: Theme;
  bundles: string[];
  selectedBundleKey: string | null;
  loading: boolean;
  error: string | null;

  // Editor state
  data: TaxonomyFile | null;
  isDirty: boolean;
  history: TaxonomyFile[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  undo: () => void;
  redo: () => void;
  jumpToHistory: (index: number) => void;
  renameSelectedBundle: (newKey: string, newName: string, newDescription?: string) => Promise<void>;
  init: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  fetchBundles: () => Promise<void>;
  selectBundle: (key: string) => Promise<void>;
  updateData: (updater: (draft: TaxonomyFile) => void) => void;
  saveData: () => Promise<void>;
  clearSelection: () => void;
}

export const useTaxonomyStore = create<TaxonomyState>((set, get) => ({
  inited: false,
  theme: 'dark',
  bundles: [],
  selectedBundleKey: null,
  loading: false,
  error: null,

  data: null,
  isDirty: false,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  init: async () => {
    const cachedTheme = (localStorage.getItem('app_theme') as Theme) || 'dark';
    if (cachedTheme === 'light' || cachedTheme === 'dark') {
      get().setTheme(cachedTheme);
    }

    const cachedBundle = localStorage.getItem('last_selected_bundle');
    if (cachedBundle) {
      await get().selectBundle(cachedBundle);
    }
    set({ inited: true });
  },

  setTheme: (theme: Theme) => {
    localStorage.setItem('app_theme', theme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    set({ theme });
  },

  fetchBundles: async () => {
    set({ loading: true, error: null });
    try {
      const bundles = await listBundles();
      set({ bundles, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch bundles', loading: false });
    }
  },

  selectBundle: async (key: string) => {
    set({ loading: true, error: null, selectedBundleKey: key });
    try {
      const data = await loadJson(key);
      if (data) {
        if (!data.categories) data.categories = [];
        if (!data.vocabularies) data.vocabularies = [];
        if (!data.attributes) data.attributes = [];
        
        data.vocabularies.forEach((v: any) => {
          if (!v.terms) v.terms = [];
          v.terms.forEach((t: any) => { if (!t.aliases) t.aliases = []; });
        });
        data.categories.forEach((c: any) => {
          if (!c.aliases) c.aliases = [];
          if (!c.attribute_bindings) c.attribute_bindings = [];
          if (!c.search_path) c.search_path = c.id || "";
        });
        data.attributes.forEach((a: any) => {
          if (!a.aliases) a.aliases = [];
        });
        
        if (data.entity_model) {
          if (!data.entity_model.entity_types) data.entity_model.entity_types = [];
          if (!data.entity_model.relation_types) data.entity_model.relation_types = [];
          data.entity_model.entity_types.forEach((e: any) => {
            if (!e.aliases) e.aliases = [];
          });
          data.entity_model.relation_types.forEach((r: any) => {
            if (!r.aliases) r.aliases = [];
          });
        }
      }
      localStorage.setItem('last_selected_bundle', key);
      const history = data ? [JSON.parse(JSON.stringify(data))] : [];
      set({ data, isDirty: false, loading: false, history, historyIndex: 0, canUndo: false, canRedo: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to open bundle', loading: false, selectedBundleKey: null });
    }
  },

  updateData: (updater) => {
    const { data, history, historyIndex } = get();
    if (!data) return;
    const newData = JSON.parse(JSON.stringify(data));
    updater(newData);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    
    set({ 
      data: newData, 
      isDirty: true, 
      history: newHistory, 
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevData = JSON.parse(JSON.stringify(history[newIndex]));
      set({
        data: prevData,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true,
        isDirty: true // conservative, as it might diverge from saved
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextData = JSON.parse(JSON.stringify(history[newIndex]));
      set({
        data: nextData,
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < history.length - 1,
        isDirty: true
      });
    }
  },

  jumpToHistory: (index: number) => {
    const { history } = get();
    if (index >= 0 && index < history.length) {
      const targetData = JSON.parse(JSON.stringify(history[index]));
      set({
        data: targetData,
        historyIndex: index,
        canUndo: index > 0,
        canRedo: index < history.length - 1,
        isDirty: true
      });
    }
  },

  renameSelectedBundle: async (newKey: string, newName: string, newDescription?: string) => {
    const { selectedBundleKey, data, bundles } = get();
    if (!selectedBundleKey || !data) return;
    set({ loading: true, error: null });
    try {
      const newData = JSON.parse(JSON.stringify(data));
      newData.meta.name = newName;
      if (newDescription !== undefined) {
        newData.meta.description = newDescription;
      }
      
      if (newKey !== selectedBundleKey) {
        await renameBundle(selectedBundleKey, newKey, newData);
        const newBundles = await listBundles();
        set({ bundles: newBundles, selectedBundleKey: newKey });
        localStorage.setItem('last_selected_bundle', newKey);
      } else {
        await saveJson(selectedBundleKey, newData);
      }
      
      const newHistory = get().history.map((h, i) => {
        if (i === get().historyIndex) return JSON.parse(JSON.stringify(newData));
        return h;
      });

      set({ data: newData, history: newHistory, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to rename bundle', loading: false });
    }
  },

  saveData: async () => {
    const { selectedBundleKey, data } = get();
    if (!selectedBundleKey || !data) return;

    set({ loading: true, error: null });
    try {
      
      const validationResults = validateTaxonomy(data);
      const errors = validationResults.filter(r => r.level === 'ERROR');
      if (errors.length > 0) {
        throw new Error(`Validation failed with ${errors.length} errors.`);
      }

      await saveJson(selectedBundleKey, data);
      
      // Update meta.updated_at
      const newData = { ...data, meta: { ...data.meta, updated_at: new Date().toISOString() } };
      
      set({ data: newData, isDirty: false, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to save', loading: false });
    }
  },

  clearSelection: () => {
    localStorage.removeItem('last_selected_bundle');
    set({ selectedBundleKey: null, data: null, isDirty: false, error: null, history: [], historyIndex: -1, canUndo: false, canRedo: false });
  }
}));
