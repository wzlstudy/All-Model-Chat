
// hooks/chat/useSuggestions.ts
import React, { useEffect, useRef, useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings } from '../../types';
import { getKeyForRequest, logService } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface SuggestionsProps {
    appSettings: AppSettings;
    activeChat: SavedChatSession | undefined;
    isLoading: boolean;
    updateAndPersistSessions: SessionsUpdater;
    language: 'en' | 'zh';
    sessionKeyMapRef?: React.MutableRefObject<Map<string, string>>;
}

export const useSuggestions = ({
    appSettings,
    activeChat,
    isLoading,
    updateAndPersistSessions,
    language,
    sessionKeyMapRef,
}: SuggestionsProps) => {
    const prevIsLoadingRef = useRef(isLoading);

    const generateAndAttachSuggestions = useCallback(async (sessionId: string, messageId: string, userContent: string, modelContent: string, sessionSettings: IndividualChatSettings) => {
        // Show loading state
        updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s, messages: s.messages.map(m => m.id === messageId ? { ...m, isGeneratingSuggestions: true } : m)
        } : s));

        try {
            const { sparkxChatNonStreamApi } = await import('../../services/api/sparkxChatApi');

            const prompt = language === 'zh'
                ? `作为对话专家，请基于以下上下文，预测用户接下来最可能发送的 3 条简短回复。
                
规则：
1. 如果助手最后在提问，建议必须是针对该问题的回答。
2. 建议应简练（20字以内），涵盖不同角度。
3. 返回 1., 2., 3. 格式的列表。不要有其他文字。

对话上下文：
用户: "${userContent}"
助手: "${modelContent}"`
                : `As a conversation expert, predict the 3 most likely short follow-up messages the USER would send based on the context below. 

Return only a numbered list (1., 2., 3.). No other text.

Context:
USER: "${userContent}"
ASSISTANT: "${modelContent}"`;

            const rawResponse = await sparkxChatNonStreamApi(
                {
                    sessionId: sessionId,
                    modelId: sessionSettings.modelId || appSettings.modelId,
                    content: prompt,
                    saveHistory: false
                },
                new AbortController().signal
            );

            const suggestions = rawResponse
                .split('\n')
                .map(s => s.replace(/^\d+\.\s*/, '').trim())
                .filter(Boolean)
                .slice(0, 3);

            if (suggestions && suggestions.length > 0) {
                updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                    ...s, messages: s.messages.map(m => m.id === messageId ? { ...m, suggestions, isGeneratingSuggestions: false } : m)
                } : s));
            } else {
                // Hide loading state if no suggestions are returned
                updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                    ...s, messages: s.messages.map(m => m.id === messageId ? { ...m, isGeneratingSuggestions: false } : m)
                } : s));
            }
        } catch (error) {
            logService.error('Suggestion generation failed in handler', { error });
            // Hide loading state on error
            updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? {
                ...s, messages: s.messages.map(m => m.id === messageId ? { ...m, isGeneratingSuggestions: false } : m)
            } : s));
        }
    }, [appSettings.modelId, language, updateAndPersistSessions]);

    useEffect(() => {
        // Trigger condition: loading just finished for the active chat
        if (prevIsLoadingRef.current && !isLoading && appSettings.isSuggestionsEnabled && activeChat) {
            const { messages, id: sessionId, settings } = activeChat;
            if (messages.length < 2) return;

            const lastMessage = messages[messages.length - 1];
            const secondLastMessage = messages[messages.length - 2];

            // Condition: The last turn was a user message followed by a model response,
            // and we haven't already fetched suggestions for it.
            if (
                lastMessage.role === 'model' &&
                !lastMessage.isLoading &&
                !lastMessage.stoppedByUser && // Check if stopped by user
                secondLastMessage.role === 'user' &&
                !lastMessage.suggestions &&
                lastMessage.isGeneratingSuggestions === undefined // Check undefined to prevent re-triggering
            ) {
                // Generate suggestions for the completed turn
                generateAndAttachSuggestions(sessionId, lastMessage.id, secondLastMessage.content, lastMessage.content, settings);
            }
        }
        prevIsLoadingRef.current = isLoading;
    }, [isLoading, activeChat, appSettings.isSuggestionsEnabled, generateAndAttachSuggestions]);
};
