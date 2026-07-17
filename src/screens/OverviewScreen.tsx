import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { validateTaxonomy } from '../utils/validation';
import { AlertCircle, CheckCircle2, ChevronRight, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TestClassification } from '../components/TestClassification';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

export function OverviewScreen() {
  const { data } = useTaxonomyStore();
  const { t } = useTranslation();
  
  if (!data) return null;

  const issues = validateTaxonomy(data);
  const errors = issues.filter(i => i.level === 'ERROR');
  const warnings = issues.filter(i => i.level === 'WARNING');

  const [validationOpen, setValidationOpen] = useState(issues.length > 0);

  useEffect(() => {
    setValidationOpen(issues.length > 0);
  }, [issues.length]);

  const stats = [
    { label: t('overview.stats.vocabularies'), count: data.vocabularies.length, link: '/vocabularies' },
    { label: t('overview.stats.categories'), count: data.categories.length, link: '/categories' },
    { label: t('overview.stats.attributes'), count: data.attributes.length, link: '/attributes' },
    { label: t('overview.stats.entity_types'), count: data.entity_model?.entity_types.length || 0, link: '/entities' },
    { label: t('overview.stats.relation_types'), count: data.entity_model?.relation_types.length || 0, link: '/entities' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-serif text-ink mb-1">{t('overview.title')}</h1>
        <p className="text-ink-dim text-[13px]">Schema version {data.schema_version} &bull; Last updated {new Date(data.meta.updated_at).toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className="block group">
            <div className="p-5 border border-border-subtle rounded-xl bg-surface-base hover:border-accent hover:shadow-sm transition-all h-full">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs uppercase tracking-[1px] font-medium text-ink-dim">{s.label}</h3>
                <ChevronRight className="w-4 h-4 text-border-subtle group-hover:text-accent transition-colors" />
              </div>
              <p className="text-3xl font-light text-ink">{s.count}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="border border-border-subtle rounded-xl overflow-hidden bg-surface-base">
        <button 
          onClick={() => setValidationOpen(!validationOpen)}
          className="w-full px-5 py-4 border-b border-border-subtle bg-surface-light flex items-center justify-between hover:bg-surface-base transition-colors"
        >
          <div className="flex items-center">
            {validationOpen ? <ChevronUp className="w-4 h-4 mr-2 text-ink-dim" /> : <ChevronDown className="w-4 h-4 mr-2 text-ink-dim" />}
            <h2 className="text-sm uppercase tracking-[1px] font-semibold text-ink">{t('overview.validation.title')}</h2>
          </div>
          <div className="flex space-x-4">
             <div className="flex items-center text-[12px] uppercase tracking-wider font-semibold">
               <AlertCircle className={`w-4 h-4 mr-1.5 ${errors.length > 0 ? 'text-red-500' : 'text-border-subtle'}`} />
               <span className={errors.length > 0 ? 'text-red-500' : 'text-ink-dim'}>{t('overview.validation.errors', { count: errors.length })}</span>
             </div>
             <div className="flex items-center text-[12px] uppercase tracking-wider font-semibold">
               <Info className={`w-4 h-4 mr-1.5 ${warnings.length > 0 ? 'text-accent' : 'text-border-subtle'}`} />
               <span className={warnings.length > 0 ? 'text-accent' : 'text-ink-dim'}>{t('overview.validation.warnings', { count: warnings.length })}</span>
             </div>
          </div>
        </button>
        
        {validationOpen && (
          <div className="p-0">
            {issues.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                 <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                 <h3 className="text-ink font-serif text-xl mb-1">{t('overview.validation.no_issues')}</h3>
                 <p className="text-ink-dim text-[13px]">{t('overview.validation.no_issues_desc')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border-subtle max-h-96 overflow-y-auto">
                {issues.map((issue, idx) => (
                  <li key={idx} className="p-4 flex items-start hover:bg-surface-light transition-colors">
                    {issue.level === 'ERROR' ? (
                       <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                       <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                    )}
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-[13px] text-ink">{issue.message}</p>
                      <div className="mt-1 flex items-center text-[11px] text-ink-dim font-mono">
                        <span className="bg-border-subtle rounded px-1.5 py-0.5 text-ink">{issue.code}</span>
                        {issue.path && <span className="ml-2 text-ink-dim opacity-60">Path: {issue.path}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <TestClassification />
      
    </div>
  );
}
