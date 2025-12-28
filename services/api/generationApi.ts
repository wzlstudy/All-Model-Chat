import { SPARKX_API_BASE_URL } from '../../constants/sparkxConstants';
import { logService } from "../logService";
import { getAuthHeaders } from "../../utils/authUtils";

export const generateImagesApi = async (_apiKey: string, modelId: string, prompt: string, aspectRatio: string, _imageSize: string | undefined, abortSignal: AbortSignal): Promise<string[]> => {
    logService.info(`Generating image via backend with model ${modelId}`, { prompt, aspectRatio });

    if (!prompt.trim()) {
        throw new Error("Image generation prompt cannot be empty.");
    }

    try {
        const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/media/image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                prompt,
                modelId,
                aspectRatio
            }),
            signal: abortSignal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend image generation failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (result.code === 200) {
            return result.data;
        } else {
            throw new Error(result.msg || "Image generation failed on server.");
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        logService.error(`Failed to generate images via backend with model ${modelId}:`, error);
        throw error;
    }
};

export const generateSpeechApi = async (_apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> => {
    logService.info(`Generating speech via backend with model ${modelId}`, { textLength: text.length, voice });

    if (!text.trim()) {
        throw new Error("TTS input text cannot be empty.");
    }

    try {
        const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/media/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                text,
                modelId,
                voice
            }),
            signal: abortSignal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend TTS failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (result.code === 200) {
            return result.data;
        } else {
            throw new Error(result.msg || "TTS failed on server.");
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        logService.error(`Failed to generate speech via backend with model ${modelId}:`, error);
        throw error;
    }
};

export const transcribeAudioApi = async (_apiKey: string, audioFile: File, modelId: string): Promise<string> => {
    logService.info(`Transcribing audio via backend with model ${modelId}`, { fileName: audioFile.name, size: audioFile.size });

    try {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('modelId', modelId);

        const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/audio/transcribe`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend transcription failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (result.code === 200) {
            return result.data;
        } else {
            throw new Error(result.msg || "Transcription failed on server.");
        }
    } catch (error) {
        logService.error("Error during backend audio transcription:", error);
        throw error;
    }
};
