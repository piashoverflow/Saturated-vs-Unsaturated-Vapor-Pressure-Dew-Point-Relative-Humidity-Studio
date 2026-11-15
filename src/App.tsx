import { useState } from 'react';
import { TopNav } from './components/TopNav';
import { Module1Chamber } from './components/Module1Chamber';
import { Module2Isotherm } from './components/Module2Isotherm';
import { Module3DewPoint } from './components/Module3DewPoint';
import { Language, ModuleId, TRANSLATIONS } from './i18n/translations';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('module1');
  const [language, setLanguage] = useState<Language>('bn');
  const [resetSignal, setResetSignal] = useState<number>(0);

  const t = TRANSLATIONS[language];

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  const handleReset = () => {
    setResetSignal((n) => n + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-slate-50 to-sky-50/70 text-slate-950">
      <TopNav
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onReset={handleReset}
        t={t}
      />

      <main className="flex-1">
        {activeModule === 'module1' && <Module1Chamber t={t} resetSignal={resetSignal} />}
        {activeModule === 'module2' && <Module2Isotherm t={t} resetSignal={resetSignal} />}
        {activeModule === 'module3' && <Module3DewPoint t={t} resetSignal={resetSignal} />}
      </main>
    </div>
  );
}
