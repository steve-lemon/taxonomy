import React, { useState, useEffect } from 'react';
import { useTaxonomyStore } from '../../store/useTaxonomyStore';

interface BundleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BundleSettingsModal({ isOpen, onClose }: BundleSettingsModalProps) {
  const { data, selectedBundleKey, renameSelectedBundle, loading, bundles } = useTaxonomyStore();
  
  const [bundleKey, setBundleKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && data && selectedBundleKey) {
      setBundleKey(selectedBundleKey);
      setName(data.meta.name);
      setDescription(data.meta.description || '');
      setError(null);
    }
  }, [isOpen, data, selectedBundleKey]);

  if (!isOpen || !data || !selectedBundleKey) return null;

  const handleSave = async () => {
    if (!bundleKey.trim() || !name.trim()) {
      setError('Bundle ID and Name are required.');
      return;
    }
    
    // Check if new key already exists
    if (bundleKey !== selectedBundleKey && bundles.includes(bundleKey)) {
      setError('A bundle with this ID already exists. Please choose a different ID.');
      return;
    }

    try {
      await renameSelectedBundle(bundleKey, name, description);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update bundle.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-surface-base border border-border-subtle rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-ink mb-1">Bundle Settings</h2>
          <p className="text-[13px] text-ink-dim mb-6">Manage your taxonomy bundle's core metadata.</p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-[13px]">
               {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-dim mb-1 uppercase tracking-wider">Bundle ID (Filename)</label>
              <input
                type="text"
                value={bundleKey}
                onChange={(e) => setBundleKey(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''))}
                className="w-full bg-surface-light border border-border-subtle rounded-md px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                placeholder="e.g., core_taxonomy"
                disabled={loading}
              />
              <p className="text-[11px] text-ink-dim mt-1">Only alphanumeric, dashes, and underscores allowed.</p>
            </div>
            
            <div>
              <label className="block text-[12px] font-semibold text-ink-dim mb-1 uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-light border border-border-subtle rounded-md px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                placeholder="e.g., Core Taxonomy"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-semibold text-ink-dim mb-1 uppercase tracking-wider">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface-light border border-border-subtle rounded-md px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                placeholder="Brief description of this taxonomy"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-surface-light px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-ink-dim hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium bg-accent text-white rounded-md hover:bg-accent/90 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
