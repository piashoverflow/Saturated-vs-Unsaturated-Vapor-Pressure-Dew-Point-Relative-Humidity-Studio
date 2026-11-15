import React from 'react';
import { Languages, RotateCcw } from 'lucide-react';
import { Language, ModuleId, Translations } from '../i18n/translations';

interface TopNavProps {
  activeModule: ModuleId;
  onSelectModule: (m: ModuleId) => void;
  language: Language;
  onToggleLanguage: () => void;
  onReset: () => void;
  t: Translations;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeModule,
  onSelectModule,
  language,
  onToggleLanguage,
  onReset,
  t,
}) => {
  const tabs: { id: ModuleId; label: string }[] = [
    { id: 'module1', label: t.tabs.module1 },
    { id: 'module2', label: t.tabs.module2 },
    { id: 'module3', label: t.tabs.module3 },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-sky-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:flex-nowrap lg:px-6">
        {/* Left: Dynamic Studio Title */}
        <div className="min-w-0 shrink">
          <h1 className="text-base font-bold tracking-tight text-slate-950 lg:text-lg truncate">
            {t.appTitle}
          </h1>
        </div>

        {/* Center: 3 Interactive Lab Mode Tabs (Pill Navigation) */}
        <nav
          aria-label="Simulation Modules"
          className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-full border border-sky-200 bg-sky-50/80 p-1 lg:order-2 lg:w-auto"
        >
          {tabs.map((tab) => {
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectModule(tab.id)}
                className={`whitespace-nowrap shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 lg:text-[13px] ${
                  isActive
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white/80 hover:text-slate-950'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Language Switcher, Reset Button & Institution Badge */}
        <div className="order-2 flex items-center gap-2 shrink-0 lg:order-3">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            title={language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <Languages className="h-3.5 w-3.5 text-sky-700" />
            <span>{t.langToggleLabel}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-700" />
            <span>{t.resetLabel}</span>
          </button>

          <span className="bg-rose-50 border border-rose-300 text-rose-600 font-extrabold px-3 py-1 rounded-full text-sm whitespace-nowrap shrink-0">
            {t.institutionBadge}
          </span>
        </div>
      </div>
    </header>
  );
};
