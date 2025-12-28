
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppLogic } from './hooks/app/useAppLogic';
import { useAppProps } from './hooks/app/useAppProps';
import { WindowProvider } from './contexts/WindowContext';
import { MainContent } from './components/layout/MainContent';
import { PiPPlaceholder } from './components/layout/PiPPlaceholder';
import { MainLayout } from './components/layout/MainLayout';
import { AppModals } from './components/modals/AppModals';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState('chat');
  const logic = useAppLogic();
  const {
    currentTheme,
    pipState,
    chatState,
    sidePanelContent,
    handleCloseSidePanel,
    uiState,
  } = logic;

  const { sidebarProps, chatAreaProps, appModalsProps } = useAppProps(logic);

  const renderModuleContent = () => {
    if (activeModule === 'chat') {
      return (
        <MainContent
          sidebarProps={sidebarProps}
          chatAreaProps={chatAreaProps}
          isHistorySidebarOpen={uiState.isHistorySidebarOpen}
          setIsHistorySidebarOpen={uiState.setIsHistorySidebarOpen}
          sidePanelContent={sidePanelContent}
          onCloseSidePanel={handleCloseSidePanel}
          themeId={currentTheme.id}
        />
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center text-xl font-medium opacity-40 select-none animate-in fade-in duration-500">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <div>{activeModule.toUpperCase()} 模块正在开发中</div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative flex h-full bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] theme-${currentTheme.id} overflow-hidden`}
      onTouchStart={uiState.handleTouchStart}
      onTouchEnd={uiState.handleTouchEnd}
    >
      <MainLayout
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onOpenSettings={() => uiState.setIsSettingsModalOpen(true)}
        t={logic.t}
      >
        <WindowProvider window={pipState.pipWindow || window} document={pipState.pipWindow?.document || document}>
          {pipState.isPipActive && pipState.pipContainer && pipState.pipWindow ? (
            <>
              {createPortal(
                <div
                  className={`theme-${currentTheme.id} h-full w-full flex relative bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]`}
                  onTouchStart={uiState.handleTouchStart}
                  onTouchEnd={uiState.handleTouchEnd}
                >
                  {renderModuleContent()}
                </div>,
                pipState.pipContainer
              )}
              <PiPPlaceholder onClosePip={pipState.togglePip} />
            </>
          ) : (
            renderModuleContent()
          )}
        </WindowProvider>
      </MainLayout>

      <AppModals {...appModalsProps} />
    </div>
  );
};

export default App;