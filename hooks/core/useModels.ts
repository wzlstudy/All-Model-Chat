
import { useState, useCallback, useEffect } from 'react';
import { ModelOption } from '../../types';
import { sortModels, getDefaultModelOptions } from '../../utils/appUtils';
import { fetchModelListApi } from '../../services/api/modelApi';

const CUSTOM_MODELS_KEY = 'custom_model_list_v1';

export const useModels = () => {
    const [apiModels, setApiModelsState] = useState<ModelOption[]>(() => {
        try {
            const stored = localStorage.getItem(CUSTOM_MODELS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load custom models', e);
        }
        return getDefaultModelOptions();
    });

    const [isModelsLoading, setIsModelsLoading] = useState(false);
    const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);

    const setApiModels = useCallback((models: ModelOption[]) => {
        setApiModelsState(models);
        localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));
    }, []);

    const fetchModels = useCallback(async () => {
        setIsModelsLoading(true);
        setModelsLoadingError(null);
        try {
            const backendModels = await fetchModelListApi();
            const mappedModels: ModelOption[] = backendModels.map(m => ({
                id: m.id, // Primary key ID from backend
                name: m.modelName || m.description || m.id,
                isPinned: true,
                providerId: m.providerId,
                providerName: m.providerName
            }));

            // Merge with existing pins or just replace
            setApiModels(sortModels(mappedModels));
        } catch (error) {
            setModelsLoadingError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsModelsLoading(false);
        }
    }, [setApiModels]);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    return { apiModels, setApiModels, isModelsLoading, modelsLoadingError, fetchModels };
};
