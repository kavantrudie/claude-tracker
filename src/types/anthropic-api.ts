// Type definitions for Anthropic Admin API responses

export interface UsageReportParams {
  start_time: string; // ISO 8601 format
  end_time: string;   // ISO 8601 format
  time_bucket?: '1m' | '1h' | '1d'; // Default: '1d'
  workspace_id?: string;
}

export interface UsageReportResponse {
  data: UsageRecord[];
}

export interface UsageRecord {
  timestamp: string; // ISO 8601 format
  model: string;
  workspace_id?: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface CostReportParams {
  start_time: string; // ISO 8601 format
  end_time: string;   // ISO 8601 format
  group_by?: 'workspace' | 'description';
  workspace_id?: string;
}

export interface CostReportResponse {
  data: CostRecord[];
  total_cost_usd: number;
}

export interface CostRecord {
  timestamp?: string;
  workspace_id?: string;
  description?: string;
  cost_usd: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface AnthropicAPIConfig {
  apiKey: string;
  baseURL?: string;
}

export interface APISyncResult {
  success: boolean;
  error?: string;
  usageData?: UsageReportResponse;
  costData?: CostReportResponse;
  syncedAt: Date;
}
