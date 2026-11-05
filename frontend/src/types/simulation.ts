export type DataLabel = 'LIVE' | 'SIMULATED' | 'PREDICTED' | 'DATA UNAVAILABLE' | 'SIMULATED ESTIMATE';

export interface AmbientEnvironment {
  temperature_c: number;
  relative_humidity_pct: number;
  atmospheric_pressure_kpa: number;
  source_label: string;
  timestamp: string;
}

export interface VirtualSensor {
  id: string;
  type: string;
  zone?: string;
  value: string | number;
  unit: string;
  label: DataLabel;
}

export interface TraditionalStorageState {
  facility_id: string;
  name: string;
  commodity: string;
  quantity_kg: number;
  internal_temp_c: number;
  internal_rh_pct: number;
  internal_o2_pct: number;
  internal_co2_ppm: number;
  o2_partial_pressure_kpa: number;
  daltons_theoretical_ceiling_kpa: number;
  quality_score: number;
  remaining_shelf_life_days: number;
  remaining_shelf_life_hours: number;
  spoilage_risk_pct: number;
  spoilage_category: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  air_changes_per_hour: number;
  ventilation_rate_m3_s: number;
  door_open: boolean;
  damper_open_pct: number;
  sensors: VirtualSensor[];
  spatial_grid: Array<{ col: number; row: number; temp_c: number; rh_pct: number }>;
  recommendations: string[];
  data_label: DataLabel;
}

export interface ColdChamberState {
  chamber_id: string;
  name: string;
  commodity: string;
  quantity_kg: number;
  allocated_crates: number;
  capacity_crates: number;
  utilization_pct: number;
  target_temp_c: number;
  target_rh_pct: number;
  internal_temp_c: number;
  internal_rh_pct: number;
  internal_o2_pct: number;
  internal_co2_ppm: number;
  // Aliases for convenience across 3D canvas and tabs
  temp_c?: number;
  rh_pct?: number;
  o2_pct?: number;
  shelf_life_days?: number;
  compressor_running: boolean;
  compressor_fault: boolean;
  door_open: boolean;
  quality_score: number;
  remaining_shelf_life_days: number;
  spoilage_risk_pct: number;
  spoilage_category: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  spatial_grid: Array<{ col: number; row: number; temp_c: number; rh_pct: number }>;
  recommendations: string[];
  data_label: DataLabel;
}

export interface ColdStorageWarehouseState {
  facility_id: string;
  name: string;
  chambers: Record<string, ColdChamberState>;
  total_allocated_crates: number;
  total_capacity_crates: number;
  overall_utilization_pct: number;
  total_produce_kg: number;
  // Aggregate statistics aliases
  mean_quality_score?: number;
  mean_temp_c?: number;
  data_label: DataLabel;
}

export interface RefrigeratedTruckState {
  truck_id: string;
  plate_number: string;
  origin: string;
  destination: string;
  route_distance_km: number;
  distance_traveled_km: number;
  route_progress_pct: number;
  current_lat: number;
  current_lng: number;
  eta_minutes: number;
  truck_speed_kmh: number;
  // Aliases for convenience
  speed_kmh?: number;
  temp_c?: number;
  shelf_life_days?: number;
  commodity: string;
  quantity_kg: number;
  target_temp_c: number;
  mean_cargo_temp_c: number;
  zone_temps: {
    front: number;
    mid: number;
    rear: number;
  };
  internal_rh_pct: number;
  reefer_on: boolean;
  reefer_active: boolean;
  reefer_fault: boolean;
  rear_door_open: boolean;
  quality_score: number;
  remaining_shelf_life_days: number;
  remaining_shelf_life_hours: number;
  spoilage_risk_pct: number;
  spoilage_category: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  total_cargo_value_inr: number;
  value_at_risk_inr: number;
  spatial_heatmap: Array<{ x: number; y: number; temp_c: number }>;
  sensors: VirtualSensor[];
  recommendations: string[];
  data_label: DataLabel;
}

export interface AlertItem {
  id: string;
  module: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  recommended_action: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface SimulationState {
  sim_id: string;
  is_running: boolean;
  sim_speed: number;
  total_simulated_seconds: number;
  simulated_hours: number;
  simulated_days: number;
  active_scenario: {
    key: string;
    name: string;
    description: string;
    ambient_temp_delta: number;
    door_open?: boolean;
    reefer_fault?: boolean;
    truck_speed_kmh?: number;
    cooling_power_factor?: number;
    ambient_rh_override?: number;
  };
  ambient_environment: AmbientEnvironment;
  traditional_storage: TraditionalStorageState;
  cold_storage: ColdStorageWarehouseState;
  refrigerated_truck: RefrigeratedTruckState;
  alerts: AlertItem[];
  unacknowledged_alerts_count: number;
  timestamp: string;
}

