import { SimulationState } from '../types/simulation';

const API_BASE = '/api/v1';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: 'ADMIN' | 'FARMER';
  is_active: boolean;
  is_admin: boolean;
  created_at?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface BatchRecord {
  id: number;
  batch_code: string;
  user_id?: number | null;
  farmer_name: string;
  commodity_name: string;
  quantity_kg: number;
  harvest_date: string | null;
  initial_quality_score: number;
  current_quality_score: number;
  storage_type: string;
  current_location: string;
  simulation_status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'TERMINATED';
  last_executed_at?: string | null;
  remaining_shelf_life_days: number;
  is_deleted?: boolean;
  created_at: string | null;
}

export interface BatchesSummary {
  total_batches: number;
  avg_remaining_shelf_life_days: number;
  active_storage_units: number;
  active_alerts_count: number;
  data_label: string;
}

export interface QRConfigStatus {
  is_configured: boolean;
  public_app_url: string | null;
  message: string;
}

export interface MandiPriceItem {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  min_price_per_kg: number;
  max_price_per_kg: number;
  modal_price_per_kg: number;
  unit: string;
  observation_timestamp: string;
  api_queried_at: string;
  source: string;
}

export interface MandiLiveResponse {
  status: string;
  is_stale: boolean;
  stale_warning?: string;
  message?: string;
  data_source: string;
  resource_id: string;
  total_count: number;
  records_count: number;
  api_queried_at: string;
  records: MandiPriceItem[];
}

export interface MandiFiltersResponse {
  commodities: string[];
  states: string[];
  districts: string[];
  markets: string[];
}

export interface MandiForecastResponse {
  commodity: string;
  market_name: string;
  current_modal_price_kg: number;
  current_modal_price_qtl?: number;
  forecast_horizon_days: number;
  trend_direction: 'UPWARD' | 'DOWNWARD' | 'STABLE';
  forecast_period: string;
  optimal_sell_day?: number;
  last_updated_at?: string;
  historical_data_points: Array<{
    day?: number;
    date: string;
    display_date?: string;
    price_per_kg: number;
    price_per_qtl?: number;
  }>;
  forecast_series: Array<{
    day: number;
    date: string;
    display_date?: string;
    day_name?: string;
    predicted_price_kg: number;
    predicted_price_qtl?: number;
    lower_bound_kg: number;
    upper_bound_kg: number;
    core_lower_kg?: number;
    core_upper_kg?: number;
    uncertainty_range: number;
    delta_vs_today?: number;
    delta_pct?: number;
  }>;
  ai_market_explanation: string;
  model_type: string;
  source_attribution: string;
}

export interface MandiOptimizeResult {
  commodity: string;
  quantity_kg: number;
  storage_days: number;
  option_a_sell_now: {
    title: string;
    price_per_kg: number;
    gross_revenue_inr: number;
    transport_cost_inr: number;
    storage_cost_inr: number;
    spoilage_loss_kg: number;
    net_profit_inr: number;
  };
  option_b_store_later: {
    title: string;
    projected_price_per_kg: number;
    saleable_quantity_kg: number;
    gross_revenue_inr: number;
    storage_cost_inr: number;
    transport_cost_inr: number;
    spoilage_loss_value_inr: number;
    net_profit_inr: number;
  };
  net_gain_inr: number;
  recommendation: 'STORE AND SELL LATER' | 'SELL IMMEDIATELY';
  assumptions_explanation: string;
}

// Token storage helpers
export const getStoredToken = (): string | null => localStorage.getItem('zr_token');
export const setStoredToken = (token: string): void => localStorage.setItem('zr_token', token);
export const removeStoredToken = (): void => localStorage.removeItem('zr_token');

const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const api = {
  // ----------------- AUTH & USER MANAGEMENT -----------------
  async getAuthStatus(): Promise<{ has_users: boolean; total_users: number; registration_open: boolean }> {
    const res = await fetch(`${API_BASE}/auth/status`);
    if (!res.ok) throw new Error('Failed to check auth status');
    return res.json();
  },

  async registerUser(data: { full_name: string; email: string; password: string; phone?: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const authData: AuthResponse = await res.json();
    setStoredToken(authData.token);
    return authData;
  },

  async loginUser(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Invalid credentials');
    }
    const authData: AuthResponse = await res.json();
    setStoredToken(authData.token);
    return authData;
  },

  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async listUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to list accounts');
    return res.json();
  },

  async createUserByAdmin(data: { full_name: string; email: string; password: string; phone?: string; role: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create user' }));
      throw new Error(err.detail || 'Failed to create user');
    }
    return res.json();
  },

  async updateUserStatus(userId: number, isActive: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) throw new Error('Failed to update user status');
    return res.json();
  },

  async deleteUser(userId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete user');
    return res.json();
  },

  logoutUser(): void {
    removeStoredToken();
  },

  // ----------------- SIMULATION STATE -----------------
  async getSimulationState(): Promise<SimulationState> {
    const res = await fetch(`${API_BASE}/simulation/state`);
    if (!res.ok) throw new Error('Failed to fetch simulation state');
    return res.json();
  },

  async updateControls(controls: any): Promise<SimulationState> {
    const res = await fetch(`${API_BASE}/simulation/controls`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(controls),
    });
    if (!res.ok) throw new Error('Failed to update simulation controls');
    return res.json();
  },

  async tickSimulation(seconds: number = 60.0): Promise<SimulationState> {
    const res = await fetch(`${API_BASE}/simulation/tick?seconds=${seconds}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to tick simulation');
    return res.json();
  },

  async resetSimulation(): Promise<SimulationState> {
    const res = await fetch(`${API_BASE}/simulation/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset simulation');
    return res.json();
  },

  async getLiveWeather(location: string = 'bengaluru') {
    const res = await fetch(`${API_BASE}/weather?location=${location}`);
    if (!res.ok) throw new Error('Failed to fetch live weather');
    return res.json();
  },

  // ----------------- BATCHES & MANAGEMENT -----------------
  async getBatches(includeDeleted: boolean = false): Promise<BatchRecord[]> {
    const res = await fetch(`${API_BASE}/batches?include_deleted=${includeDeleted}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch produce batches');
    return res.json();
  },

  async createBatch(batchData: {
    farmer_name?: string;
    commodity_name: string;
    quantity_kg: number;
    harvest_date?: string;
    location?: string;
    initial_quality_score?: number;
    storage_type?: string;
  }): Promise<BatchRecord> {
    const res = await fetch(`${API_BASE}/batches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(batchData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create batch' }));
      throw new Error(err.detail || 'Failed to create batch');
    }
    return res.json();
  },

  async getBatchDetails(batchId: number | string): Promise<any> {
    const res = await fetch(`${API_BASE}/batches/${batchId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch batch details');
    return res.json();
  },

  async getBatchHistory(batchId: number | string): Promise<any> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/history`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch batch simulation history');
    return res.json();
  },

  async resumeBatchSimulation(batchId: number | string): Promise<any> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to resume batch simulation');
    return res.json();
  },

  async deleteBatch(batchId: number | string, permanent: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/batches/${batchId}?permanent=${permanent}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete batch' }));
      throw new Error(err.detail || 'Failed to delete batch');
    }
    return res.json();
  },

  async askGroqExplanation(promptText: string, mode: string = 'shelf_life', commodity: string = 'tomato') {
    const res = await fetch(`${API_BASE}/ai/explain?mode=${mode}&commodity=${commodity}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch AI explanation');
    return res.json();
  },

  async getBatchesSummary(): Promise<BatchesSummary> {
    const res = await fetch(`${API_BASE}/batches/summary`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch batches summary');
    return res.json();
  },

  // ----------------- DATA.GOV.IN MANDI PRICES & FORECASTING -----------------
  async getLiveMandiPrices(filters: {
    commodity?: string;
    state?: string;
    district?: string;
    market?: string;
    arrival_date?: string;
    offset?: number;
    limit?: number;
  }): Promise<MandiLiveResponse> {
    const params = new URLSearchParams();
    if (filters.commodity) params.set('commodity', filters.commodity);
    if (filters.state) params.set('state', filters.state);
    if (filters.district) params.set('district', filters.district);
    if (filters.market) params.set('market', filters.market);
    if (filters.arrival_date) params.set('arrival_date', filters.arrival_date);
    if (filters.offset !== undefined) params.set('offset', String(filters.offset));
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));

    const res = await fetch(`${API_BASE}/market/live?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch mandi market prices from data.gov.in');
    return res.json();
  },

  async getMandiFilters(): Promise<MandiFiltersResponse> {
    const res = await fetch(`${API_BASE}/market/filters`);
    if (!res.ok) throw new Error('Failed to fetch mandi filters');
    return res.json();
  },

  async forecastMandiPrices(data: { commodity: string; market_name: string; forecast_days?: number }): Promise<MandiForecastResponse> {
    const res = await fetch(`${API_BASE}/market/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to calculate mandi price forecast');
    return res.json();
  },

  async optimizeMandiSelling(data: {
    commodity_name: string;
    quantity_kg: number;
    current_modal_price_kg: number;
    projected_modal_price_kg: number;
    storage_days?: number;
    storage_type?: string;
    transport_cost_per_kg?: number;
  }): Promise<MandiOptimizeResult> {
    const res = await fetch(`${API_BASE}/market/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to solve selling optimization');
    return res.json();
  },

  // ----------------- INSPECTIONS & SCANNING -----------------
  async scanConveyorItem(commodity: string = 'tomato', profile: string = 'random') {
    const res = await fetch(`${API_BASE}/inspections/scan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ commodity_name: commodity, defect_profile: profile }),
    });
    if (!res.ok) throw new Error('Failed to scan item');
    return res.json();
  },

  async uploadProduceImage(commodity: string, file: File) {
    const formData = new FormData();
    formData.append('commodity', commodity);
    formData.append('file', file);
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/inspections/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to inspect uploaded image');
    return res.json();
  },

  // ----------------- ALERTS -----------------
  async acknowledgeAlert(alertId: string) {
    const res = await fetch(`${API_BASE}/alerts/acknowledge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ alert_id: alertId }),
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  },

  // ----------------- QR & MOBILE ACCESS -----------------
  async getQRConfig(): Promise<QRConfigStatus> {
    const res = await fetch(`${API_BASE}/qr/config`);
    if (!res.ok) throw new Error('Failed to fetch QR configuration');
    return res.json();
  },

  async updateQRConfig(publicUrl: string) {
    const res = await fetch(`${API_BASE}/qr/config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ public_app_url: publicUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update QR configuration' }));
      throw new Error(err.detail || 'Failed to update QR configuration');
    }
    return res.json();
  },

  async generateQRSession(assetType: string, assetId: string, title: string, customPublicUrl?: string) {
    const res = await fetch(`${API_BASE}/qr/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        asset_type: assetType,
        asset_id: assetId,
        asset_title: title,
        expires_in_hours: 24,
        custom_public_url: customPublicUrl,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate QR session' }));
      throw new Error(err.detail || 'Failed to generate QR session');
    }
    return res.json();
  },

  async revokeQRSession(token: string) {
    const res = await fetch(`${API_BASE}/qr/revoke/${token}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to revoke QR session');
    return res.json();
  },

  async getMobileAsset(token: string) {
    const res = await fetch(`${API_BASE}/qr/access/${token}`);
    if (!res.ok) throw new Error('Failed to access mobile asset');
    return res.json();
  },

  async getAnalyticsComparison() {
    const res = await fetch(`${API_BASE}/analytics/comparison`);
    if (!res.ok) throw new Error('Failed to fetch analytics comparison');
    return res.json();
  },

  async getTelegramStatus() {
    const res = await fetch(`${API_BASE}/telegram/status`);
    if (!res.ok) throw new Error('Failed to fetch Telegram status');
    return res.json();
  },

  async sendTelegramTest() {
    const res = await fetch(`${API_BASE}/telegram/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send Telegram test' }));
      throw new Error(err.detail || 'Failed to send Telegram test');
    }
    return res.json();
  },

  async sendTelegramDigest() {
    const res = await fetch(`${API_BASE}/telegram/digest`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send Telegram digest' }));
      throw new Error(err.detail || 'Failed to send Telegram digest');
    }
    return res.json();
  },
};
