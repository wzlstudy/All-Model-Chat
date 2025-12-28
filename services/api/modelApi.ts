
import { SPARKX_API_BASE_URL } from '../../constants/sparkxConstants';
import { getAuthHeaders } from '../../utils/authUtils';

export interface AiModelVo {
  id: string;
  providerId: string;
  providerName: string;
  modelName: string;
  modelCode: string;
  description: string;
  capabilities: Record<string, any>;
  status: number;
  create_time?: string;
  update_time?: string;
}

export interface PageResult<T> {
  total: number;
  data: T[];
}

export interface AjaxResult<T> {
  code: number;
  msg: string;
  data: T;
}

/**
 * Fetch model list from SparkX backend
 */
export const fetchModelListApi = async (page: number = 1, pageSize: number = 1000): Promise<AiModelVo[]> => {
  try {
    const response = await fetch(`${SPARKX_API_BASE_URL}/api/aiModel/list?pageNo=${page}&pageSize=${pageSize}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    const result: AjaxResult<PageResult<AiModelVo>> = await response.json();
    if (result.code !== 0) {
      throw new Error(result.msg || 'Unknown error fetching models');
    }
    return result.data.data;
  } catch (error) {
    console.error('Error in fetchModelListApi:', error);
    throw error;
  }
};
