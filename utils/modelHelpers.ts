
import { ModelOption } from '../types';
import { GEMINI_3_RO_MODELS, STATIC_TTS_MODELS, STATIC_IMAGEN_MODELS, TAB_CYCLE_MODELS } from '../constants/appConstants';
import { MediaResolution } from '../types/settings';

// --- Model Sorting & Defaults ---

export const sortModels = (models: ModelOption[]): ModelOption[] => {
    const getCategoryWeight = (id: string) => {
        const lower = id.toLowerCase();
        if (lower.includes('tts')) return 4;
        if (lower.includes('imagen')) return 3;
        if (lower.includes('image')) return 2;
        return 1;
    };

    return [...models].sort((a, b) => {
        // First sort by provider
        const providerA = a.providerName || '';
        const providerB = b.providerName || '';
        const providerCompare = providerA.localeCompare(providerB);
        if (providerCompare !== 0) return providerCompare;

        // Then by pinned status within provider
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // Then by name
        return a.name.localeCompare(b.name);
    });
};

export const getDefaultModelOptions = (): ModelOption[] => {
    const pinnedInternalModels: ModelOption[] = TAB_CYCLE_MODELS.map(id => {
        let name;
        if (id === 'gemini-2.5-flash-preview-09-2025') {
            name = 'Gemini 2.5 Flash';
        } else if (id === 'gemini-2.5-flash-lite-preview-09-2025') {
            name = 'Gemini 2.5 Flash Lite';
        } else if (id.toLowerCase().includes('gemma')) {
            name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else {
            name = id.includes('/')
                ? `Gemini ${id.split('/')[1]}`.replace('gemini-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : `Gemini ${id.replace('gemini-', '').replace(/-/g, ' ')}`.replace(/\b\w/g, l => l.toUpperCase());
        }
        return { id, name, isPinned: true };
    });
    return sortModels([...pinnedInternalModels, ...STATIC_TTS_MODELS, ...STATIC_IMAGEN_MODELS]);
};

// --- Helper for Model Capabilities ---
export const isGemini3Model = (modelId: string): boolean => {
    if (!modelId) return false;
    const lowerId = modelId.toLowerCase();
    return GEMINI_3_RO_MODELS.some(m => lowerId.includes(m)) || lowerId.includes('gemini-3-pro');
};

// --- Model Settings Cache ---
const MODEL_SETTINGS_CACHE_KEY = 'model_settings_cache';

export interface CachedModelSettings {
    mediaResolution?: MediaResolution;
    thinkingBudget?: number;
    thinkingLevel?: 'LOW' | 'HIGH';
}

export const getCachedModelSettings = (modelId: string): CachedModelSettings | undefined => {
    try {
        const cache = JSON.parse(localStorage.getItem(MODEL_SETTINGS_CACHE_KEY) || '{}');
        return cache[modelId];
    } catch {
        return undefined;
    }
};

export const cacheModelSettings = (modelId: string, settings: CachedModelSettings) => {
    if (!modelId) return;
    try {
        const cache = JSON.parse(localStorage.getItem(MODEL_SETTINGS_CACHE_KEY) || '{}');
        cache[modelId] = { ...cache[modelId], ...settings };
        localStorage.setItem(MODEL_SETTINGS_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error("Failed to cache model settings", e);
    }
};
