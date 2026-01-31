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
}

export interface FlightSegment {
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  blockHours: number;
  performance: number;
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
  date: Date;
  dateString?: string; // Raw YYYY-MM-DD from backend for timezone-safe day extraction
  dayOfWeek: string;
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
      | 'afternoon_nap';
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
  };
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
  strategyType: 'recovery' | 'normal';
  confidence: number;
}

export interface AnalysisResults {
  statistics: DutyStatistics;
  duties: DutyAnalysis[];
  generatedAt: Date;
  month: Date; // Actual month from the roster data
  // Pilot info from backend
  pilotId?: string;
  pilotName?: string;
  pilotBase?: string;
  pilotAircraft?: string;
  // Rest day sleep data
  restDaysSleep?: RestDaySleep[];
}
