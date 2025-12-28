
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Image as ImageIcon,
  Workflow,
  Grid,
  Settings,
  Video,
  Music,
  Bot,
  LogOut,
  LogIn,
  UserCircle
} from 'lucide-react';

interface PrimarySidebarItem {
  id: string;
  icon: React.ElementType;
  label: string;
}

interface PrimarySidebarProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  onOpenSettings: () => void;
  t: (key: any) => string;
  currentUser: any | null;
  onLogout: () => void;
  onLoginClick: () => void;
}

export const PrimarySidebar: React.FC<PrimarySidebarProps> = ({
  activeModule,
  onModuleChange,
  onOpenSettings,
  t,
  currentUser,
  onLogout,
  onLoginClick
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const topItems: PrimarySidebarItem[] = [
    { id: 'chat', icon: MessageSquare, label: 'AI 对话' },
    { id: 'paint', icon: ImageIcon, label: 'MJ 绘画' },
    { id: 'video', icon: Video, label: 'AI 视频' },
    { id: 'workflow', icon: Workflow, label: '工作流' },
    { id: 'music', icon: Music, label: 'Suno' },
    { id: 'app-center', icon: Grid, label: '应用中心' },
  ];

  return (
    <aside className="primary-sidebar">
      <div className="flex flex-col items-center flex-1 w-full gap-2">
        <div className="mb-4 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <Bot size={24} strokeWidth={2.5} />
          </div>
        </div>

        {topItems.map((item) => (
          <div
            key={item.id}
            className={`primary-sidebar-item relative group ${activeModule === item.id ? 'active' : ''}`}
            onClick={() => onModuleChange(item.id)}
          >
            <item.icon />
            <span className="primary-sidebar-label">{item.label}</span>

            {/* Active Indicator */}
            {activeModule === item.id && (
              <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full" />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center pb-2 gap-2">
        <div
          className="primary-sidebar-item group relative"
          onClick={onOpenSettings}
        >
          <Settings />
          <span className="primary-sidebar-label">设置</span>
        </div>

        {/* User Section */}
        <div className="relative pt-2 mt-2 border-t border-[var(--theme-border-secondary)] w-full flex justify-center">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="group relative w-10 h-10 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 border border-[var(--theme-border-secondary)] hover:border-indigo-500/50 shadow-sm"
                title={currentUser.nickName || currentUser.name || currentUser.userId}
              >
                {currentUser.avatar && currentUser.avatar !== "null" ? (
                  <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center text-indigo-500">
                    <UserCircle size={24} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </button>

              {isUserMenuOpen && createPortal(
                <>
                  <div className="fixed inset-0 z-[9998] bg-black/5" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="fixed bottom-4 left-[88px] w-64 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[9999] py-3 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="px-5 py-4 border-b border-[var(--theme-border-secondary)] mb-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--theme-border-secondary)] flex-shrink-0">
                        {currentUser.avatar && currentUser.avatar !== "null" ? (
                          <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500/10 to-purple-600/10 flex items-center justify-center text-indigo-500">
                            <UserCircle size={20} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-sm font-bold text-[var(--theme-text-primary)] truncate" title={currentUser.nickName || currentUser.name || currentUser.userId}>
                          {currentUser.nickName || currentUser.name || currentUser.userId}
                        </p>
                        {(currentUser.nickName || currentUser.name) && (
                          <p className="text-xs text-[var(--theme-text-tertiary)] truncate opacity-70 mt-0.5" title={currentUser.userId}>
                            ID: {currentUser.userId}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-[calc(100%-1rem)] mx-2 px-3 py-2.5 flex items-center gap-3 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200 active:scale-95"
                    >
                      <LogOut size={18} />
                      <span className="font-medium whitespace-nowrap">退出登录</span>
                    </button>
                  </div>
                </>
                , document.body)}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="primary-sidebar-item flex-col"
              style={{ height: 'auto', padding: '8px' }}
              title="请登录"
            >
              <LogIn size={20} />
              <span className="text-[10px] mt-1">登录</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
