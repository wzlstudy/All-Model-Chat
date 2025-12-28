import { SPARKX_API_BASE_URL } from '../../constants/sparkxConstants';
import { logService } from '../logService';
import { getAuthHeaders, setAuthToken } from '../../utils/authUtils';

export interface SparkxChatRequest {
  sessionId?: string;
  modelId: string;
  content: string;
  appId?: string;
  saveHistory?: boolean;
  // Model Parameters
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  isGoogleSearchEnabled?: boolean;
  isCodeExecutionEnabled?: boolean;
  isUrlContextEnabled?: boolean;
  isDeepSearchEnabled?: boolean;
  files?: any[];
}

export interface SparkxChatResponse {
  type: 'content' | 'thought' | 'tool_call' | 'tool_result' | 'done' | 'error';
  delta?: string;
  tool?: {
    name: string;
    arguments: string;
    callId: string;
  };
  metadata?: {
    usage?: {
      totalTokenCount: number;
      promptTokenCount: number;
      candidatesTokenCount: number;
      thoughtsTokenCount?: number;
    };
    grounding?: any;
    urlContext?: any;
  };
}

/**
 * Streaming chat with SparkX backend
 */
export const sparkxChatStreamApi = async (
  request: SparkxChatRequest,
  signal: AbortSignal,
  onMessage: (message: SparkxChatResponse) => void,
  onError: (error: Error) => void
): Promise<void> => {
  logService.info(`Sending message to SparkX: ${request.modelId}`);

  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SSE Request Failed: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE message splitting (data: ...)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last partial line

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.substring(5).trim();
          if (!dataStr) continue;
          try {
            const parsed: SparkxChatResponse = JSON.parse(dataStr);
            onMessage(parsed);
          } catch (e) {
            logService.warn('Failed to parse SSE message:', dataStr);
          }
        }
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      logService.info('Streaming aborted.');
      return;
    }
    logService.error('SparkX Streaming Error:', e);
    onError(e instanceof Error ? e : new Error(String(e)));
  }
};

/**
 * Non-streaming chat helper (collects all content chunks)
 */
export const sparkxChatNonStreamApi = async (
  request: SparkxChatRequest,
  signal: AbortSignal
): Promise<string> => {
  let fullContent = '';
  return new Promise((resolve, reject) => {
    sparkxChatStreamApi(
      { ...request, saveHistory: request.saveHistory ?? false },
      signal,
      (msg) => {
        if (msg.type === 'content' && msg.delta) {
          fullContent += msg.delta;
        } else if (msg.type === 'done') {
          resolve(fullContent);
        } else if (msg.type === 'error') {
          reject(new Error(msg.delta || 'Unknown error'));
        }
      },
      reject
    );
  });
};
/**
 * Clear all chat history for the current user
 */
export const clearChatHistoryApi = async (): Promise<boolean> => {
  logService.info('Clearing all chat history from backend...');
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/chat/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logService.error(`Failed to clear history: ${response.status} ${errorText}`);
      return false;
    }

    const result = await response.json();
    return result.code === 0;
  } catch (e) {
    logService.error('Error calling clear history API:', e);
    return false;
  }
};
/**
 * Fetch all sessions for the current user
 */
export const getSessionsApi = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/chat/sessions`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    const result = await response.json();
    return result.code === 0 ? result.data : [];
  } catch (e) {
    logService.error('Error fetching sessions:', e);
    return [];
  }
};

/**
 * Fetch messages for a specific session
 */
export const getSessionMessagesApi = async (sessionId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/chat/history?sessionId=${sessionId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    const result = await response.json();
    return result.code === 0 ? result.data : [];
  } catch (e) {
    logService.error('Error fetching messages:', e);
    return [];
  }
};

/**
 * Delete a session
 */
export const deleteSessionApi = async (sessionId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/chat/session/delete?sessionId=${sessionId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await response.json();
    return result.code === 0;
  } catch (e) {
    logService.error('Error deleting session:', e);
    return false;
  }
};

/**
 * Rename a session
 */
export const renameSessionApi = async (sessionId: string, title: string): Promise<boolean> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/chat/session/rename?sessionId=${sessionId}&title=${encodeURIComponent(title)}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await response.json();
    return result.code === 0;
  } catch (e) {
    logService.error('Error renaming session:', e);
    return false;
  }
};

/**
 * Toggle pin status of a session
 */
export const pinSessionApi = async (sessionId: string, isPinned: boolean): Promise<boolean> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/chat/session/pin?sessionId=${sessionId}&isPinned=${isPinned}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await response.json();
    return result.code === 0;
  } catch (e) {
    logService.error('Error pinning session:', e);
    return false;
  }
};

/**
 * Fetch all scenarios for the current user
 */
export const getScenariosApi = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/scenario/list`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch scenarios');
    const result = await response.json();
    return result.code === 0 ? result.data : [];
  } catch (e) {
    logService.error('Error fetching scenarios:', e);
    return [];
  }
};

/**
 * Save or update a scenario
 */
export const saveScenarioApi = async (scenario: any): Promise<boolean> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/scenario/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(scenario)
    });
    const result = await response.json();
    return result.code === 0;
  } catch (e) {
    logService.error('Error saving scenario:', e);
    return false;
  }
};

/**
 * Delete a scenario
 */
export const deleteScenarioApi = async (scenarioId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/ai/scenario/delete?scenarioId=${scenarioId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await response.json();
    return result.code === 0;
  } catch (e) {
    logService.error('Error deleting scenario:', e);
    return false;
  }
};

/**
 * Login with username and password
 */
export const loginApi = async (username: string, password: string): Promise<{ token: string } | null> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/login/doLogin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error('Login failed');
    const result = await response.json();
    if (result.code === 0 && result.data?.token) {
      setAuthToken(result.data.token);
      return result.data;
    }
    return null;
  } catch (e) {
    logService.error('Login error:', e);
    return null;
  }
};

/**
 * Get current user information
 */
export const getUserInfoApi = async (): Promise<any | null> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/login/getUserInfo`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.code === 0 ? result.data : null;
  } catch (e) {
    logService.error('Get user info error:', e);
    return null;
  }
};
