
import React from 'react';
import { PrimarySidebar } from './PrimarySidebar';
import { translations } from '../../utils/appUtils';

interface MainLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  onOpenSettings: () => void;
  t: (key: keyof typeof translations) => string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeModule,
  onModuleChange,
  onOpenSettings,
  t
}) => {
  return (
    <div className="main-layout-container">
      <PrimarySidebar
        activeModule={activeModule}
        onModuleChange={onModuleChange}
        onOpenSettings={onOpenSettings}
        t={t}
      />
      <main className="module-container">
        {children}
      </main>
    </div>
  );
};
