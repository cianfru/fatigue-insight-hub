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
}

export interface AnalysisResults {
  statistics: DutyStatistics;
  duties: DutyAnalysis[];
  generatedAt: Date;
}
