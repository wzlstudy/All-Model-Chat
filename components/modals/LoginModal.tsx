
import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { loginApi } from '../../services/api/sparkxChatApi';
import { LogIn, User, Lock, AlertCircle, Loader2, Bot } from 'lucide-react';
import { translations } from '../../utils/appUtils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: (key: keyof typeof translations) => string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, t }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await loginApi(username, password);
      if (result && result.token) {
        onSuccess();
        onClose();
      } else {
        setError('登录失败：用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败：网络请求错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="bg-[var(--theme-bg-primary)]/80 backdrop-blur-2xl border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] rounded-[2.5rem] w-full max-w-md overflow-hidden"
      backdropClassName="bg-black/40 backdrop-blur-md"
    >
      <div className="relative p-8 sm:p-10">
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 blur-[80px] -z-10 pointer-events-none rounded-full" />

        <div className="flex flex-col items-center mb-8 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl transform hover:rotate-6 transition-transform duration-300">
              <LogIn size={36} strokeWidth={2.5} />
            </div>
          </div>

          <h2 className="text-3xl font-black text-[var(--theme-text-primary)] mb-3 tracking-tight">
            欢迎回来
          </h2>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)] bg-indigo-500/10 px-5 py-2 rounded-full border border-indigo-500/20 backdrop-blur-sm shadow-sm">
            <Bot size={16} className="text-indigo-500" />
            <span>登录账号以开启智能对话</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between px-1">
              <label className="text-sm font-bold text-[var(--theme-text-primary)] uppercase tracking-wider opacity-90">用户名</label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--theme-text-tertiary)] group-focus-within:text-indigo-500 transition-colors duration-300">
                <User size={20} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full pl-12 pr-4 py-4 bg-[var(--theme-bg-input)]/50 border-2 border-transparent hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl outline-none transition-all text-[var(--theme-text-primary)] font-medium shadow-inner placeholder:text-[var(--theme-text-tertiary)]/50"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between px-1">
              <label className="text-sm font-bold text-[var(--theme-text-primary)] uppercase tracking-wider opacity-90">密码</label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--theme-text-tertiary)] group-focus-within:text-indigo-500 transition-colors duration-300">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-12 pr-4 py-4 bg-[var(--theme-bg-input)]/50 border-2 border-transparent hover:border-indigo-500/30 focus:border-indigo-500 rounded-2xl outline-none transition-all text-[var(--theme-text-primary)] font-medium shadow-inner placeholder:text-[var(--theme-text-tertiary)]/50"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} />
              </div>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-400/50 disabled:to-purple-400/50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-[0_10px_30px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_40px_-5px_rgba(79,70,229,0.5)] active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  <span className="tracking-wide">正在安全连接...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">立即登录</span>
                  <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>
        </form>
      </div>
    </Modal>
  );
};
