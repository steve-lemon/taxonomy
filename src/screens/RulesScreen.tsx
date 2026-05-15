import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { AttributeMergeStrategy, Status } from '../types/taxonomy';
import { Input } from '../components/ui/Input';
import { Settings, Shield, Workflow, Layers } from 'lucide-react';

export function RulesScreen() {
  const { data, updateData } = useTaxonomyStore();

  if (!data) return null;

  const rules = data.rules;

  const toggleRule = (key: keyof typeof rules) => {
    updateData(draft => {
      (draft.rules as any)[key] = !draft.rules[key];
    });
  };

  const updateMultiCategory = (key: string, value: any) => {
    updateData(draft => {
      (draft.rules.multi_category as any)[key] = value;
    });
  };

  return (
    <div className="flex h-full bg-bg-base overflow-y-auto">
      <div className="flex-1 max-w-4xl p-8 mx-auto">
        <div className="mb-8">
          <h2 className="text-[28px] font-serif text-ink mb-2">Global Rules</h2>
          <p className="text-ink-dim text-[14px]">Configure the validation constraints and behaviors for the taxonomy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Uniqueness Constraints */}
          <div className="bg-surface-base border border-border-subtle rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-accent" />
              <h3 className="text-[16px] font-medium text-ink">Uniqueness Constraints</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[14px] text-ink mb-1">Unique IDs</h4>
                  <p className="text-[12px] text-ink-dim leading-relaxed">Require globally unique identifiers across all entity types.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input type="checkbox" className="sr-only peer" checked={rules.id_unique} onChange={() => toggleRule('id_unique')} />
                  <div className="w-9 h-5 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
                </label>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[14px] text-ink mb-1">Unique Attribute Keys</h4>
                  <p className="text-[12px] text-ink-dim leading-relaxed">Ensure attribute keys do not collide within category bindings.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input type="checkbox" className="sr-only peer" checked={rules.attribute_key_unique} onChange={() => toggleRule('attribute_key_unique')} />
                  <div className="w-9 h-5 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
                </label>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[14px] text-ink mb-1">Unique Search Paths</h4>
                  <p className="text-[12px] text-ink-dim leading-relaxed">Prevent multiple categories from sharing the exact same search path.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input type="checkbox" className="sr-only peer" checked={rules.search_path_unique} onChange={() => toggleRule('search_path_unique')} />
                  <div className="w-9 h-5 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Behavior Rules */}
          <div className="bg-surface-base border border-border-subtle rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Workflow className="w-5 h-5 text-accent" />
              <h3 className="text-[16px] font-medium text-ink">Behaviors</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[14px] text-ink mb-1">Child Overrides Parent</h4>
                  <p className="text-[12px] text-ink-dim leading-relaxed">Allow child categories to redefine attribute settings inherited from parents.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input type="checkbox" className="sr-only peer" checked={rules.child_override_parent} onChange={() => toggleRule('child_override_parent')} />
                  <div className="w-9 h-5 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Multi-category Support */}
          <div className="bg-surface-base border border-border-subtle rounded-xl p-6 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <Layers className="w-5 h-5 text-accent" />
              <h3 className="text-[16px] font-medium text-ink">Multi-Category Configuration</h3>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[14px] text-ink mb-1">Enable Multiple Categories</h4>
                  <p className="text-[12px] text-ink-dim leading-relaxed">Allow entities to be assigned to more than one category simultaneously.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={rules.multi_category.enabled} 
                    onChange={e => updateMultiCategory('enabled', e.target.checked)} 
                  />
                  <div className="w-9 h-5 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-border-subtle"></div>
                </label>
              </div>

              {rules.multi_category.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface-light rounded-lg border border-border-subtle">
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] text-ink font-medium">Max Categories Per Photo/Asset</label>
                    <Input 
                      type="number" 
                      min="1"
                      value={rules.multi_category.max_categories_per_photo} 
                      onChange={e => updateMultiCategory('max_categories_per_photo', parseInt(e.target.value) || 1)}
                      className="bg-bg-base h-9 text-[13px]"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] text-ink font-medium">Attribute Merge Strategy</label>
                    <select
                       value={rules.multi_category.attribute_merge_strategy}
                       onChange={(e) => updateMultiCategory('attribute_merge_strategy', e.target.value as AttributeMergeStrategy)}
                       className="w-full rounded-[6px] border border-border-subtle bg-bg-base text-ink px-3 h-9 text-[13px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                     >
                       <option value="union">Union (Combine all attributes)</option>
                       <option value="intersection">Intersection (Only common attributes)</option>
                       <option value="priority">Priority (Based on primary category)</option>
                     </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
