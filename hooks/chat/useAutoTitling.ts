
import React, { useCallback, useEffect } from 'react';
import { AppSettings, SavedChatSession } from '../../types';
import { getKeyForRequest, logService, generateSessionTitle } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface AutoTitlingProps {
    appSettings: AppSettings;
    savedSessions: SavedChatSession[];
    updateAndPersistSessions: SessionsUpdater;
    language: 'en' | 'zh';
    generatingTitleSessionIds: Set<string>;
    setGeneratingTitleSessionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    sessionKeyMapRef?: React.MutableRefObject<Map<string, string>>;
}

export const useAutoTitling = ({
    appSettings,
    savedSessions,
    updateAndPersistSessions,
    language,
    generatingTitleSessionIds,
    setGeneratingTitleSessionIds,
    sessionKeyMapRef,
}: AutoTitlingProps) => {

    const generateTitleForSession = useCallback(async (session: SavedChatSession) => {
        const { id: sessionId, messages } = session;
        if (messages.length < 2) return;

        setGeneratingTitleSessionIds(prev => new Set(prev).add(sessionId));
        logService.info(`Auto-generating title for session ${sessionId}`);

        try {
            const userContent = messages[0].content;
            const modelContent = messages[messages.length - 1].content;

            if (!userContent.trim() && !modelContent.trim()) {
                logService.info(`Skipping title generation for session ${sessionId} due to empty content.`);
                return;
            }

            const { sparkxChatNonStreamApi } = await import('../../services/api/sparkxChatApi');

            const prompt = language === 'zh'
                ? `根据以下对话，创建一个非常简短、简洁的标题（最多4-6个词）。不要使用引号或任何其他格式。只返回标题的文本。\n\n用户: "${userContent}"\n助手: "${modelContent}"\n\n标题:`
                : `Based on this conversation, create a very short, concise title (4-6 words max). Do not use quotes or any other formatting. Just return the text of the title.\n\nUSER: "${userContent}"\nASSISTANT: "${modelContent}"\n\nTITLE:`;

            const newTitle = await sparkxChatNonStreamApi(
                {
                    sessionId: sessionId,
                    modelId: session.settings.modelId || appSettings.modelId,
                    content: prompt,
                    saveHistory: false
                },
                new AbortController().signal // Title generation is quick, usually no need for persistent abort controller here
            );

            if (newTitle && newTitle.trim()) {
                // Clean up the title: remove quotes
                let cleanedTitle = newTitle.trim();
                if ((cleanedTitle.startsWith('"') && cleanedTitle.endsWith('"')) || (cleanedTitle.startsWith("'") && cleanedTitle.endsWith("'"))) {
                    cleanedTitle = cleanedTitle.substring(1, cleanedTitle.length - 1);
                }

                logService.info(`Generated new title for session ${sessionId}: "${cleanedTitle}"`);
                updateAndPersistSessions(prev =>
                    prev.map(s => (s.id === sessionId ? { ...s, title: cleanedTitle } : s))
                );
            } else {
                logService.warn(`Title generation for session ${sessionId} returned an empty string.`);
            }

        } catch (error) {
            logService.error(`Failed to auto-generate title for session ${sessionId}`, { error });
            // Fallback to local generation
            const localTitle = generateSessionTitle(messages);
            if (localTitle && localTitle !== 'New Chat') {
                updateAndPersistSessions(prev =>
                    prev.map(s => (s.id === sessionId ? { ...s, title: localTitle } : s))
                );
            }
        } finally {
            setGeneratingTitleSessionIds(prev => {
                const next = new Set(prev);
                next.delete(sessionId);
                return next;
            });
        }
    }, [appSettings.modelId, updateAndPersistSessions, language, setGeneratingTitleSessionIds]);

    useEffect(() => {
        if (!appSettings.isAutoTitleEnabled) return;

        const candidates = savedSessions.filter(session => {
            // Only title "New Chat" sessions
            if (session.title !== 'New Chat') return false;

            // Skip if already generating
            if (generatingTitleSessionIds.has(session.id)) return false;

            // Need at least user prompt and model response
            if (session.messages.length < 2) return false;

            const firstMsg = session.messages[0];
            const secondMsg = session.messages[1];

            // Basic structure check
            if (firstMsg.role !== 'user' || secondMsg.role !== 'model') return false;

            // Wait for the first model message to be complete
            if (secondMsg.isLoading || secondMsg.stoppedByUser) return false;

            return true;
        });

        candidates.forEach(session => {
            generateTitleForSession(session);
        });

    }, [savedSessions, appSettings.isAutoTitleEnabled, generatingTitleSessionIds, generateTitleForSession]);

};
