
import React from 'react';
import {
  MessageSquare,
  Image as ImageIcon,
  Workflow,
  Grid,
  Settings,
  Video,
  Music,
  Bot
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
}

export const PrimarySidebar: React.FC<PrimarySidebarProps> = ({
  activeModule,
  onModuleChange,
  onOpenSettings,
  t
}) => {
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

      <div className="flex flex-col items-center pb-2">
        <div
          className="primary-sidebar-item group relative"
          onClick={onOpenSettings}
        >
          <Settings />
          <span className="primary-sidebar-label">设置</span>
        </div>
      </div>
    </aside>
  );
};
