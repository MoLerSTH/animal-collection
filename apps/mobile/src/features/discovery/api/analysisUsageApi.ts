import { request } from '../../../core/api/request';
import { getApiBaseUrl } from '../../../core/api/config';
export interface AnalysisUsage { used: number; limit: number; remaining: number; resetsAt: string }
export async function analysisUsageApi(): Promise<AnalysisUsage | null> {
  try {
    const response = await request(`${getApiBaseUrl()}/api/v1/discovery/usage`, {}, 8000);
    if (!response.ok) return null;
    const usage = await response.json();
    return typeof usage?.remaining === 'number' && typeof usage?.limit === 'number' && typeof usage?.resetsAt === 'string' ? usage : null;
  } catch { return null; }
}
