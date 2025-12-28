
import { useCallback } from 'react';
import { generateUniqueId, buildContentParts, createChatHistoryForApi, getKeyForRequest, generateSessionTitle, logService, createNewSession } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { buildGenerationConfig } from '../../services/api/baseApi';
import { isLikelyHtml } from '../../utils/codeUtils';
import { ChatMessage, UploadedFile } from '../../types';
import { StandardChatProps } from './types';

export const useStandardChat = ({
    appSettings,
    currentChatSettings,
    messages,
    selectedFiles,
    setSelectedFiles,
    editingMessageId,
    setEditingMessageId,
    setAppFileError,
    aspectRatio,
    imageSize,
    userScrolledUp,
    activeSessionId,
    setActiveSessionId,
    activeJobs,
    setLoadingSessionIds,
    updateAndPersistSessions,
    getStreamHandlers,
    sessionKeyMapRef,
    handleGenerateCanvas,
}: StandardChatProps) => {

    const sendStandardMessage = useCallback(async (textToUse: string, filesToUse: UploadedFile[], effectiveEditingId: string | null, activeModelId: string) => {
        const sessionToUpdate = currentChatSettings;

        const keyResult = getKeyForRequest(appSettings, sessionToUpdate);
        if ('error' in keyResult) {
            logService.error("Send message failed: API Key not configured.");
            const errorMsg: ChatMessage = { id: generateUniqueId(), role: 'error', content: keyResult.error, timestamp: new Date() };
            const newSession = createNewSession({ ...DEFAULT_CHAT_SETTINGS, ...appSettings }, [errorMsg], "API Key Error");
            updateAndPersistSessions(p => [newSession, ...p]);
            setActiveSessionId(newSession.id);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        const shouldLockKey = isNewKey && filesToUse.some(f => f.fileUri && f.uploadState === 'active');

        const newAbortController = new AbortController();
        const generationId = generateUniqueId();
        const generationStartTime = new Date();

        const successfullyProcessedFiles = filesToUse.filter(f => f.uploadState === 'active' && !f.error && !f.isProcessing);

        // Pass modelId and mediaResolution to buildContentParts for per-part injection
        const { contentParts: promptParts, enrichedFiles } = await buildContentParts(
            textToUse.trim(),
            successfullyProcessedFiles,
            activeModelId,
            sessionToUpdate.mediaResolution
        );

        let finalSessionId = activeSessionId;

        const userMessageContent: ChatMessage = { id: generateUniqueId(), role: 'user', content: textToUse.trim(), files: enrichedFiles.length ? enrichedFiles : undefined, timestamp: new Date() };
        const modelMessageContent: ChatMessage = { id: generationId, role: 'model', content: '', timestamp: new Date(), isLoading: true, generationStartTime: generationStartTime };

        // Perform a single, atomic state update for adding messages and creating a new session if necessary.
        if (!finalSessionId) { // New Chat
            let newSessionSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
            if (shouldLockKey) newSessionSettings.lockedApiKey = keyToUse;

            userMessageContent.cumulativeTotalTokens = 0;
            const newSession = createNewSession(newSessionSettings, [userMessageContent, modelMessageContent], "New Chat");
            finalSessionId = newSession.id;

            updateAndPersistSessions(p => [newSession, ...p.filter(s => s.messages.length > 0)]);
            setActiveSessionId(newSession.id);
        } else { // Existing Chat or Edit
            updateAndPersistSessions(prev => prev.map(s => {
                const isSessionToUpdate = effectiveEditingId ? s.messages.some(m => m.id === effectiveEditingId) : s.id === finalSessionId;
                if (!isSessionToUpdate) return s;

                const editIndex = effectiveEditingId ? s.messages.findIndex(m => m.id === effectiveEditingId) : -1;
                const baseMessages = editIndex !== -1 ? s.messages.slice(0, editIndex) : [...s.messages];

                userMessageContent.cumulativeTotalTokens = baseMessages.length > 0 ? (baseMessages[baseMessages.length - 1].cumulativeTotalTokens || 0) : 0;
                const newMessages = [...baseMessages, userMessageContent, modelMessageContent];

                let newTitle = s.title;
                if (s.title === 'New Chat' && !appSettings.isAutoTitleEnabled) {
                    newTitle = generateSessionTitle(newMessages);
                }
                let updatedSettings = s.settings;
                if (shouldLockKey && !s.settings.lockedApiKey) {
                    updatedSettings = { ...s.settings, lockedApiKey: keyToUse };
                }
                return { ...s, messages: newMessages, title: newTitle, settings: updatedSettings };
            }));
        }

        // --- Store Key Affinity for this session ---
        if (finalSessionId) {
            sessionKeyMapRef.current.set(finalSessionId, keyToUse);
        }

        if (editingMessageId) {
            setEditingMessageId(null);
        }

        if (promptParts.length === 0) {
            setLoadingSessionIds(prev => { const next = new Set(prev); next.delete(finalSessionId!); return next; });
            activeJobs.current.delete(generationId);
            return;
        }

        // Prepare Stateless Chat Params
        let baseMessagesForApi: ChatMessage[] = messages;
        if (effectiveEditingId) {
            const editIndex = messages.findIndex(m => m.id === effectiveEditingId);
            if (editIndex !== -1) {
                baseMessagesForApi = messages.slice(0, editIndex);
            }
        }

        const historyForChat = await createChatHistoryForApi(baseMessagesForApi);
        const config = buildGenerationConfig(
            activeModelId,
            sessionToUpdate.systemInstruction,
            { temperature: sessionToUpdate.temperature, topP: sessionToUpdate.topP },
            sessionToUpdate.showThoughts,
            sessionToUpdate.thinkingBudget,
            !!sessionToUpdate.isGoogleSearchEnabled,
            !!sessionToUpdate.isCodeExecutionEnabled,
            !!sessionToUpdate.isUrlContextEnabled,
            sessionToUpdate.thinkingLevel,
            aspectRatio,
            sessionToUpdate.isDeepSearchEnabled,
            imageSize,
            sessionToUpdate.safetySettings,
            sessionToUpdate.mediaResolution // Pass to config builder
        );

        // Pass generationStartTime by value to create a closure-safe handler
        const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
            finalSessionId!,
            generationId,
            newAbortController,
            generationStartTime,
            sessionToUpdate,
            (msgId, content) => {
                if (appSettings.autoCanvasVisualization && content && content.length > 50 && !isLikelyHtml(content)) {
                    const trimmed = content.trim();
                    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
                        return;
                    }

                    logService.info("Auto-triggering Canvas visualization for message", { msgId });
                    handleGenerateCanvas(msgId, content);
                }
            }
        );

        setLoadingSessionIds(prev => new Set(prev).add(finalSessionId!));
        activeJobs.current.set(generationId, newAbortController);

        // Import the new API
        const { sparkxChatStreamApi } = await import('../../services/api/sparkxChatApi');

        await sparkxChatStreamApi(
            {
                sessionId: finalSessionId!,
                modelId: activeModelId,
                content: textToUse.trim(),
                temperature: sessionToUpdate.temperature,
                topP: sessionToUpdate.topP,
                systemInstruction: sessionToUpdate.systemInstruction,
                isGoogleSearchEnabled: !!sessionToUpdate.isGoogleSearchEnabled,
                isCodeExecutionEnabled: !!sessionToUpdate.isCodeExecutionEnabled,
                isUrlContextEnabled: !!sessionToUpdate.isUrlContextEnabled,
                isDeepSearchEnabled: !!sessionToUpdate.isDeepSearchEnabled,
                files: enrichedFiles.length ? enrichedFiles : undefined,
            },
            newAbortController.signal,
            (msg) => {
                switch (msg.type) {
                    case 'content':
                        if (msg.delta) streamOnPart({ text: msg.delta });
                        break;
                    case 'thought':
                        if (msg.delta) onThoughtChunk(msg.delta);
                        break;
                    case 'done':
                        streamOnComplete(msg.metadata?.usage, msg.metadata?.grounding, msg.metadata?.urlContext);
                        break;
                    case 'error':
                        streamOnError(new Error(msg.delta || 'Unknown backend error'));
                        break;
                    case 'tool_call':
                        // Handle tool call if UI supports it, for now we map it to specialized text or ignored
                        logService.info('Tool call received from SparkX:', msg.tool);
                        break;
                }
            },
            streamOnError
        );
    }, [
        appSettings, currentChatSettings, messages, editingMessageId,
        setEditingMessageId, aspectRatio, imageSize, activeSessionId,
        setActiveSessionId, activeJobs, setLoadingSessionIds,
        updateAndPersistSessions, getStreamHandlers, handleGenerateCanvas,
        sessionKeyMapRef
    ]);

    return { sendStandardMessage };
};
