
import { GeminiService, ModelOption, ThoughtSupportingPart } from '../types';
import { GenerateContentResponse, Part, UsageMetadata, File as GeminiFile, Modality } from "@google/genai";
import { uploadFileApi, getFileMetadataApi } from './api/fileApi';
import {
    generateImagesApi,
    generateSpeechApi,
    transcribeAudioApi,
} from './api/generationApi';
import {
    sendStatelessMessageNonStreamApi,
} from './api/chatApi';
import { logService } from "./logService";

type ChatHistoryItem = any; // Fallback for removed type

class GeminiServiceImpl implements GeminiService {
    async uploadFile(apiKey: string, file: File, mimeType: string, displayName: string, abortSignal: AbortSignal, onProgress?: (loaded: number, total: number) => void): Promise<GeminiFile> {
        return uploadFileApi(apiKey, file, mimeType, displayName, abortSignal, onProgress);
    }

    async getFileMetadata(apiKey: string, name: string): Promise<GeminiFile> {
        return getFileMetadataApi(apiKey, name);
    }

    async generateImages(apiKey: string, modelId: string, prompt: string, aspectRatio?: string, imageSize?: string, abortSignal?: AbortSignal): Promise<string[]> {
        return generateImagesApi(apiKey, modelId, prompt, aspectRatio || '1:1', imageSize, abortSignal || new AbortController().signal);
    }

    async generateSpeech(apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> {
        return generateSpeechApi(apiKey, modelId, text, voice, abortSignal);
    }

    async transcribeAudio(apiKey: string, audioFile: File, modelId: string): Promise<string> {
        return transcribeAudioApi(apiKey, audioFile, modelId);
    }

    async translateText(apiKey: string, text: string, targetLanguage: string = 'English'): Promise<string> {
        // This is now handled by hooks using SparkX, but keeping for interface compatibility
        logService.warn("geminiServiceInstance.translateText is deprecated.");
        return text;
    }

    async generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string> {
        logService.warn("geminiServiceInstance.generateTitle is deprecated.");
        return "";
    }

    async generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]> {
        logService.warn("geminiServiceInstance.generateSuggestions is deprecated.");
        return [];
    }

    async countTokens(apiKey: string, modelId: string, parts: Part[]): Promise<number> {
        logService.warn("geminiServiceInstance.countTokens is deprecated.");
        return 0;
    }

    async editImage(apiKey: string, modelId: string, history: ChatHistoryItem[], parts: Part[], abortSignal: AbortSignal, aspectRatio?: string, imageSize?: string): Promise<Part[]> {
        return new Promise((resolve, reject) => {
            if (abortSignal.aborted) {
                const abortError = new Error("aborted");
                abortError.name = "AbortError";
                return reject(abortError);
            }
            const handleComplete = (responseParts: Part[]) => {
                resolve(responseParts);
            };
            const handleError = (error: Error) => {
                reject(error);
            };

            const config: any = {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            };

            if (aspectRatio && aspectRatio !== 'Auto') {
                if (!config.imageConfig) config.imageConfig = {};
                config.imageConfig.aspectRatio = aspectRatio;
            }

            if (modelId === 'gemini-3-pro-image-preview' && imageSize) {
                if (!config.imageConfig) config.imageConfig = {};
                config.imageConfig.imageSize = imageSize;
            }

            sendStatelessMessageNonStreamApi(
                apiKey,
                modelId,
                history,
                parts,
                config,
                abortSignal,
                handleError,
                (responseParts, thoughts, usage, grounding) => handleComplete(responseParts)
            );
        });
    }

    // Unused but required by interface for now (will be fully removed in next cleanup)
    async sendMessageStream(): Promise<void> { logService.error("sendMessageStream is removed."); }
    async sendMessageNonStream(): Promise<void> { logService.error("sendMessageNonStream is removed."); }
}

export const geminiServiceInstance: GeminiService = new GeminiServiceImpl();
