import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTaxonomyStore } from '../store/useTaxonomyStore';
import { Button } from '../components/ui/Button';
import { validateTaxonomy } from '../utils/validation';
import { validateWithLines, IssueWithLine } from '../utils/jsonSourceMap';
import { Layers, ListTree, Tags, Hash, Settings as SettingsIcon, FolderOpen, Save, FileJson, AlertCircle, Moon, Sun, ArrowLeftRight, Undo2, Redo2, Edit2, Menu, X, ExternalLink, Globe } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { BundleSettingsModal } from '../components/ui/BundleSettingsModal';
import { CopilotChat } from '../components/CopilotChat';
import { useTranslation } from 'react-i18next';

export function AppShell() {
  const { data, selectedBundleKey, isDirty, loading, saveData, clearSelection, theme, setTheme, undo, redo, canUndo, canRedo } = useTaxonomyStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [bundleSettingsOpen, setBundleSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorPanelOpen, setErrorPanelOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ko' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  if (!data) return null;

  const validErrors = validateTaxonomy(data).filter(r => r.level === 'ERROR').length;
  
  const detailedIssues = errorPanelOpen 
    ? validateWithLines(data, JSON.stringify(data, null, 2)).filter(r => r.level === 'ERROR')
    : [];

  const handleDiscardConfirm = () => {
    if (selectedBundleKey) {
      useTaxonomyStore.getState().selectBundle(selectedBundleKey);
    }
    setDiscardConfirmOpen(false);
  };
  
  const navItems = [
    { to: '/', label: t('app.sidebar.overview'), icon: <Layers className="w-4 h-4" /> },
    { to: '/vocabularies', label: t('app.sidebar.vocabularies'), icon: <ListTree className="w-4 h-4" /> },
    { to: '/attributes', label: t('app.sidebar.attributes'), icon: <Tags className="w-4 h-4" /> },
    { to: '/categories', label: t('app.sidebar.categories'), icon: <FolderOpen className="w-4 h-4" /> },
    { to: '/entities', label: t('app.sidebar.entities'), icon: <Hash className="w-4 h-4" /> },
    { to: '/rules', label: t('app.sidebar.rules'), icon: <SettingsIcon className="w-4 h-4" /> },
    { to: '/raw', label: t('app.sidebar.raw'), icon: <FileJson className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-base text-ink relative">
      {/* Top navbar */}
      <header className="flex-shrink-0 min-h-16 border-b border-border-subtle flex items-center justify-between px-4 sm:px-6 bg-surface-base flex-wrap gap-2 py-2 sm:py-0">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button 
            className="md:hidden p-2 -ml-2 text-ink-dim hover:text-ink"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif italic text-base sm:text-lg flex items-center gap-2 text-accent whitespace-nowrap">
             Taxonomy 
          </span>
          <div className="h-4 w-px bg-border-subtle hidden sm:block" />
          <div className="flex flex-wrap items-center space-x-2">
            <span className="text-[10px] tracking-widest uppercase text-ink-dim border border-border-subtle px-2 py-0.5 rounded flex items-center gap-2 my-1 sm:my-0 mt-1 sm:mt-0">
              {selectedBundleKey}
              <button onClick={() => setBundleSettingsOpen(true)} className="text-accent hover:text-ink transition-colors flex items-center pl-1 border-l border-border-subtle" title="Bundle Settings">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={clearSelection} className="text-accent hover:text-ink transition-colors flex items-center pl-1 border-l border-border-subtle" title="Change Bundle">
                <ArrowLeftRight className="w-3 h-3" />
              </button>
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0 overflow-x-auto ml-auto px-1 sm:px-0">
          <button 
            onClick={toggleLanguage}
            className="text-ink-dim hover:text-ink p-1.5 rounded-full transition-colors flex items-center justify-center shrink-0 uppercase text-[10px] sm:text-[11px] font-bold"
            title="Toggle Language"
          >
            <Globe className="w-4 h-4 mr-1" />
            {i18n.language === 'en' ? 'EN' : 'KO'}
          </button>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-ink-dim hover:text-ink p-1.5 rounded-full transition-colors flex items-center justify-center sm:mr-2 shrink-0"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {validErrors > 0 && (
             <button onClick={() => setErrorPanelOpen(!errorPanelOpen)} className={`flex items-center text-red-500 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold shrink-0 p-1.5 rounded-md hover:bg-red-500/10 transition-colors ${errorPanelOpen ? 'bg-red-500/10' : ''}`}>
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {validErrors} <span className="hidden sm:inline ml-1">Errors</span>
             </button>
          )}
          {validErrors === 0 && (
            <div className="flex items-center text-ink text-[10px] sm:text-[11px] uppercase tracking-wider shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('app.header.no_errors')}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1 border-r border-border-subtle sm:pr-4 pr-2 shrink-0">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-md text-ink-dim hover:text-ink hover:bg-surface-light disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-md text-ink-dim hover:text-ink hover:bg-surface-light disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDiscardConfirmOpen(true)} disabled={!isDirty} className="shrink-0 hidden sm:flex">
            {t('app.header.discard')}
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            disabled={!isDirty || loading || validErrors > 0} 
            onClick={saveData}
            className="shrink-0 text-xs px-2 sm:px-3"
          >
            {t('app.header.save')}
          </Button>
        </div>
      </header>

      {/* Error Panel Popover */}
      {errorPanelOpen && detailedIssues.length > 0 && validErrors > 0 && (
        <div className="absolute top-[60px] right-2 sm:right-6 w-[340px] sm:w-96 max-h-[80vh] bg-surface-base border border-border-subtle shadow-xl rounded-xl z-[100] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-surface-light">
            <h3 className="text-[13px] font-bold text-ink flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              Validation Errors ({detailedIssues.length})
            </h3>
            <button onClick={() => setErrorPanelOpen(false)} className="text-ink-dim hover:text-ink p-1 rounded-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-2 flex flex-col gap-2 bg-bg-base">
            {detailedIssues.map((issue, idx) => (
              <div key={idx} className="p-3 bg-surface-base border border-red-500/20 rounded-lg group cursor-pointer hover:bg-red-500/5 transition-colors shadow-sm" onClick={() => {
                setErrorPanelOpen(false);
                if (issue.line) {
                  navigate(`/raw?line=${issue.line}&t=${Date.now()}`);
                } else {
                  navigate('/raw');
                }
              }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] text-red-500 px-1.5 py-0.5 bg-red-500/10 rounded">{issue.path}</span>
                  {issue.line && (
                    <span className="text-[10px] text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-surface-light px-1.5 py-0.5 rounded border border-border-subtle">
                      Line {issue.line} <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-ink leading-relaxed">{issue.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
        )}
        
        {/* Sidebar */}
        <aside className={`absolute md:relative z-50 w-[240px] md:w-[220px] h-full flex-shrink-0 border-r border-border-subtle bg-surface-base flex flex-col p-6 transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
          <div className="flex md:hidden items-center justify-between mb-6 pb-6 border-b border-border-subtle">
            <span className="font-serif italic text-lg text-accent">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-ink-dim hover:text-ink p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 md:py-2.5 text-[14px] md:text-[13px] rounded-md transition-colors ${
                    isActive 
                      ? 'bg-surface-light text-accent font-semibold' 
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Center Workspace */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-base">
          <div className="flex-1 overflow-y-auto w-full relative">
             <Outlet />
          </div>
        </main>
      </div>

      <ConfirmDeleteModal
        isOpen={discardConfirmOpen}
        title="Discard Changes"
        message="Are you sure you want to discard all your unsaved changes? This cannot be undone."
        onConfirm={handleDiscardConfirm}
        onCancel={() => setDiscardConfirmOpen(false)}
        confirmText="Discard"
      />
      <CopilotChat />
      <BundleSettingsModal isOpen={bundleSettingsOpen} onClose={() => setBundleSettingsOpen(false)} />
    </div>
  );
}
