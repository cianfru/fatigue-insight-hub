// src/lib/api-client.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://web-production-7a4fb.up.railway.app';

// ============================================================================
// TYPES (matching your existing types in src/types/fatigue.ts)
// ============================================================================

export interface DutySegment {
  flight_number: string;
  departure: string;
  arrival: string;
  departure_time: string;
  arrival_time: string;
  departure_time_local: string;  // Pre-converted to HH:mm in home base timezone
  arrival_time_local: string;    // Pre-converted to HH:mm in home base timezone
  block_hours: number;
}

// Sleep block from strategic sleep estimator
export interface SleepBlockResponse {
  sleep_start_time: string;
  sleep_end_time: string;
  sleep_start_iso: string;
  sleep_end_iso: string;
  sleep_type: 'main' | 'nap';
  duration_hours: number;
  effective_hours: number;
  quality_factor: number;
}

// Strategic sleep estimator output (SleepQualityResponse from backend)
export interface SleepEstimate {
  total_sleep_hours: number;
  effective_sleep_hours: number;
  sleep_efficiency: number;
  wocl_overlap_hours: number;
  sleep_strategy:
    | 'anchor'
    | 'split'
    | 'nap'
    | 'extended'
    | 'restricted'
    | 'recovery'
    | 'normal'
    // Additional backend strategies
    | 'early_bedtime'
    | 'afternoon_nap';
  confidence: number;
  warnings: string[];
  // Sleep blocks array (detailed sleep periods)
  sleep_blocks?: SleepBlockResponse[];
  // Sleep timing (HH:mm in home base timezone) - optional top-level convenience fields
  sleep_start_time?: string | null;
  sleep_end_time?: string | null;
  // ISO timestamps for precise date/time positioning - optional top-level convenience fields
  sleep_start_iso?: string | null;
  sleep_end_iso?: string | null;
}

export interface Duty {
  duty_id: string;
  date: string;
  report_time_utc: string;
  release_time_utc: string;
  duty_hours: number;
  sectors: number;
  segments: DutySegment[];
  
  min_performance: number;
  avg_performance: number;
  landing_performance: number | null;
  
  sleep_debt: number;
  wocl_hours: number;
  prior_sleep: number;
  
  // Strategic sleep estimator fields
  sleep_estimate?: SleepEstimate;
  // Backend currently returns this key
  sleep_quality?: SleepEstimate;
  
  risk_level: 'low' | 'moderate' | 'high' | 'critical' | 'extreme' | 'unknown';
  is_reportable: boolean;
  pinch_events: number;
  max_fdp_hours?: number;
  extended_fdp_hours?: number;
  used_discretion?: boolean;
}

// Rest day sleep block from backend
export interface RestDaySleepBlock {
  sleep_start_time: string;
  sleep_end_time: string;
  sleep_start_iso: string;
  sleep_end_iso: string;
  sleep_type: 'main' | 'nap';
  duration_hours: number;
  effective_hours: number;
  quality_factor: number;
}

// Rest day sleep entry from backend
export interface RestDaySleep {
  date: string;
  sleep_blocks: RestDaySleepBlock[];
  total_sleep_hours: number;
  effective_sleep_hours: number;
  sleep_efficiency: number;
  strategy_type: 'recovery' | 'normal';
  confidence: number;
}

export interface AnalysisResult {
  analysis_id: string;
  roster_id: string;
  pilot_id: string;
  pilot_name: string | null;
  pilot_base: string | null;
  pilot_aircraft: string | null;
  month: string;
  
  total_duties: number;
  total_sectors: number;
  total_duty_hours: number;
  total_block_hours: number;
  
  high_risk_duties: number;
  critical_risk_duties: number;
  total_pinch_events: number;
  
  avg_sleep_per_night: number;
  max_sleep_debt: number;
  
  worst_duty_id: string;
  worst_performance: number;
  
  duties: Duty[];
  rest_days_sleep?: RestDaySleep[];
}

export interface Statistics {
  totalDuties: number;
  totalSectors: number;
  highRiskDuties: number;
  criticalRiskDuties: number;
  totalPinchEvents: number;
  avgSleepPerNight: number;
  maxSleepDebt: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function analyzeRoster(
  file: File,
  pilotId: string,
  homeBase: string,
  configPreset: string = 'default'
): Promise<AnalysisResult> {
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pilot_id', pilotId);
  formData.append('home_base', homeBase);
  formData.append('config_preset', configPreset);
  
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Analysis failed');
  }
  
  return response.json();
}

export async function getDutyDetail(
  analysisId: string,
  dutyId: string
) {
  
  const response = await fetch(
    `${API_BASE_URL}/api/duty/${analysisId}/${dutyId}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch duty detail');
  }
  
  return response.json();
}

export async function getChronogram(
  analysisId: string,
  mode: 'risk' | 'state' | 'hybrid' = 'risk',
  theme: 'light' | 'dark' = 'light',
  showAnnotations: boolean = true
): Promise<string> {
  
  const response = await fetch(`${API_BASE_URL}/api/visualize/chronogram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysis_id: analysisId,
      mode,
      theme,
      show_annotations: showAnnotations,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate chronogram');
  }
  
  const data = await response.json();
  return data.image; // Returns "data:image/png;base64,..."
}

export async function getCalendar(
  analysisId: string,
  theme: 'light' | 'dark' = 'light'
): Promise<string> {
  
  const response = await fetch(`${API_BASE_URL}/api/visualize/calendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysis_id: analysisId,
      theme,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate calendar');
  }
  
  const data = await response.json();
  return data.image;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
