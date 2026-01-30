// Anthropic Admin API client for fetching usage and cost data

import {
  UsageReportParams,
  UsageReportResponse,
  CostReportParams,
  CostReportResponse,
  AnthropicAPIConfig,
} from '../types/anthropic-api.js';

export class AnthropicClient {
  private apiKey: string;
  private baseURL: string;

  constructor(config: AnthropicAPIConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
  }

  /**
   * Fetch usage report from Anthropic Admin API
   * Requires Admin API key (sk-ant-admin...)
   */
  async getUsageReport(params: UsageReportParams): Promise<UsageReportResponse> {
    const url = new URL('/v1/organizations/usage_report/messages', this.baseURL);

    // Add query parameters
    url.searchParams.append('start_time', params.start_time);
    url.searchParams.append('end_time', params.end_time);

    if (params.time_bucket) {
      url.searchParams.append('time_bucket', params.time_bucket);
    }

    if (params.workspace_id) {
      url.searchParams.append('workspace_id', params.workspace_id);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic API error (${response.status}): ${errorText}\n\n` +
        `Note: Usage API requires an Admin API key (starts with sk-ant-admin...)`
      );
    }

    return await response.json() as UsageReportResponse;
  }

  /**
   * Fetch cost report from Anthropic Admin API
   * Requires Admin API key (sk-ant-admin...)
   */
  async getCostReport(params: CostReportParams): Promise<CostReportResponse> {
    const url = new URL('/v1/organizations/cost_report', this.baseURL);

    // Add query parameters
    url.searchParams.append('start_time', params.start_time);
    url.searchParams.append('end_time', params.end_time);

    if (params.group_by) {
      url.searchParams.append('group_by', params.group_by);
    }

    if (params.workspace_id) {
      url.searchParams.append('workspace_id', params.workspace_id);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic API error (${response.status}): ${errorText}\n\n` +
        `Note: Cost API requires an Admin API key (starts with sk-ant-admin...)`
      );
    }

    return await response.json() as CostReportResponse;
  }

  /**
   * Validate that the API key is properly formatted
   */
  static isAdminKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-ant-admin');
  }

  /**
   * Get API key from environment variable or Claude Code settings
   */
  static getAPIKey(): string | null {
    // Try environment variable first
    if (process.env.ANTHROPIC_ADMIN_API_KEY) {
      return process.env.ANTHROPIC_ADMIN_API_KEY;
    }

    // Try standard API key (might not work for admin endpoints)
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }

    return null;
  }
}
