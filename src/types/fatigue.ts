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
  dayOfWeek: string;
  dutyHours: number;
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
}

export interface AnalysisResults {
  statistics: DutyStatistics;
  duties: DutyAnalysis[];
  generatedAt: Date;
  // Pilot info from backend
  pilotId?: string;
  pilotName?: string;
  pilotBase?: string;
  pilotAircraft?: string;
}
