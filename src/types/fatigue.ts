export interface PilotSettings {
  pilotId: string;
  homeBase: string;
  analysisType: 'single' | 'range';
  selectedMonth: Date;
  startDate?: Date;
  endDate?: Date;
  theme: 'dark' | 'light';
  configPreset: string;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export interface DutyStatistics {
  totalDuties: number;
  totalSectors: number;
  totalDutyHours: number;
  totalBlockHours: number;
  highRiskDuties: number;
  criticalRiskDuties: number;
  maxSleepDebt: number;
  // Additional statistics from backend
  totalPinchEvents: number;
  avgSleepPerNight: number;
  worstPerformance: number;
  worstDutyId?: string;
}

export interface FlightSegment {
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;      // HH:mm in home base local time
  arrivalTime: string;        // HH:mm in home base local time
  departureTimeUtc?: string;  // HH:mmZ (Zulu time, formatted)
  arrivalTimeUtc?: string;    // HH:mmZ (Zulu time, formatted)
  blockHours: number;
  performance: number;
  // New airport-local time fields
  departureTimeAirportLocal?: string;  // HH:mm in actual airport timezone
  arrivalTimeAirportLocal?: string;    // HH:mm in actual airport timezone
  departureTimezone?: string;          // IANA timezone e.g. "Asia/Kolkata"
  arrivalTimezone?: string;            // IANA timezone e.g. "Asia/Qatar"
  departureUtcOffset?: number | null;  // UTC offset hours e.g. 5.5
  arrivalUtcOffset?: number | null;    // UTC offset hours e.g. 3.0
}

export type FlightPhase = 'preflight' | 'taxi' | 'takeoff' | 'climb' | 'cruise' | 'descent' | 'approach' | 'landing';

export interface PinchEvent {
  time: string;
  phase: FlightPhase;
  performance: number;
  circadian: number;
  sleepPressure: number;
  severity: 'high' | 'critical';
}

export interface FlightPhasePerformance {
  phase: FlightPhase;
  performance: number;
  isCritical: boolean;
}

export interface DutyAnalysis {
  dutyId?: string; // Backend duty_id (used for fetching detailed duty breakdown)
  date: Date;
  dateString?: string; // Raw YYYY-MM-DD from backend for timezone-safe day extraction
  dayOfWeek: string;
  reportTimeUtc?: string; // Raw report_time_utc from backend (ISO or HH:mm)
  reportTimeLocal?: string; // Report time in home base timezone (HH:mm)
  releaseTimeLocal?: string; // Release time in home base timezone (HH:mm)
  dutyHours: number;
  blockHours: number;
  sectors: number;
  minPerformance: number;
  avgPerformance: number;
  landingPerformance: number;
  sleepDebt: number;
  woclExposure: number;
  priorSleep: number;
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  minPerformanceRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  landingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  smsReportable: boolean;
  flightSegments: FlightSegment[];
  // EASA ORO.FTL fields
  maxFdpHours?: number; // Base FDP limit from ORO.FTL.205
  extendedFdpHours?: number; // Extended limit with discretion
  actualFdpHours?: number; // Actual FDP worked
  usedDiscretion?: boolean; // Commander discretion used
  fdpExceedance?: number; // Hours over limit (if any)
  // Per-timeline performance degradation points (from GET /api/duty/{id}/{duty_id})
  timelinePoints?: TimelinePoint[];
  // Existing optional fields
  pinchEvents?: PinchEvent[];
  circadianPhaseShift?: number;
  phasePerformance?: FlightPhasePerformance[];
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  sleepEnvironment?: 'home' | 'layover';
  
  // Strategic sleep estimator fields
  sleepEstimate?: {
    totalSleepHours: number;
    effectiveSleepHours: number;
    sleepEfficiency: number;
    woclOverlapHours: number;
    sleepStrategy:
      | 'anchor'
      | 'split'
      | 'nap'
      | 'extended'
      | 'restricted'
      | 'recovery'
      | 'normal'
      // Additional backend strategies
      | 'early_bedtime'
      | 'afternoon_nap'
      | 'post_duty_recovery';
    confidence: number;
    warnings: string[];
    // Sleep timing (HH:mm in home base timezone)
    sleepStartTime?: string;
    sleepEndTime?: string;
    // ISO timestamps for precise date/time positioning
    sleepStartIso?: string;
    sleepEndIso?: string;
    // Pre-computed day/hour values (timezone-safe - already converted by backend)
    sleepStartDay?: number;   // Day of month (1-31)
    sleepStartHour?: number;  // Hour (0-24, decimal)
    sleepEndDay?: number;     // Day of month (1-31)
    sleepEndHour?: number;    // Hour (0-24, decimal)
    // Detailed sleep quality data from backend
    explanation?: string;
    confidenceBasis?: string;
    qualityFactors?: SleepQualityFactors;
    references?: SleepReference[];
  };
}

// Sleep quality calculation factors
export interface SleepQualityFactors {
  base_efficiency: number;
  wocl_boost: number;
  late_onset_penalty: number;
  recovery_boost: number;
  time_pressure_factor: number;
  insufficient_penalty: number;
  pre_duty_awake_hours?: number; // Hours awake before report (Dawson & Reid, 1997)
}

// Per-timeline point performance degradation factors
export interface TimelinePoint {
  hours_on_duty: number;           // Hours since report
  time_on_task_penalty: number;    // TOT decrement ~0.008/h (Folkard & Åkerstedt, 1999)
  sleep_inertia: number;           // Process W component (Tassi & Muzet, 2000)
  sleep_pressure: number;          // Process S (Borbély, 1982)
  circadian: number;               // Process C (Dijk & Czeisler, 1995)
  performance?: number;            // Combined performance score
}

// Academic reference for sleep calculations
export interface SleepReference {
  key: string;
  short: string;
  full: string;
}

// Rest day sleep block (transformed from backend)
export interface RestDaySleepBlock {
  sleepStartTime: string;
  sleepEndTime: string;
  sleepStartIso: string;
  sleepEndIso: string;
  sleepType: 'main' | 'nap';
  durationHours: number;
  effectiveHours: number;
  qualityFactor: number;
}

// Rest day sleep (transformed from backend)
export interface RestDaySleep {
  date: Date;
  sleepBlocks: RestDaySleepBlock[];
  totalSleepHours: number;
  effectiveSleepHours: number;
  sleepEfficiency: number;
  strategyType: 'recovery' | 'normal' | 'post_duty_recovery';
  confidence: number;
  // Quality factor breakdown from backend
  explanation?: string;
  confidenceBasis?: string;
  qualityFactors?: SleepQualityFactors;
  references?: SleepReference[];
}

export interface AnalysisResults {
  statistics: DutyStatistics;
  duties: DutyAnalysis[];
  generatedAt: Date;
  month: Date; // Actual month from the roster data
  analysisId?: string; // Backend analysis_id
  // Pilot info from backend
  pilotId?: string;
  pilotName?: string;
  pilotBase?: string;
  pilotAircraft?: string;
  homeBaseTimezone?: string; // IANA timezone e.g. "Asia/Qatar"
  // Rest day sleep data
  restDaysSleep?: RestDaySleep[];
}
