import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyAnalysis, FlightPhase } from '@/types/fatigue';
import { Badge } from '@/components/ui/badge';
import { Plane, AlertTriangle } from 'lucide-react';

interface FlightPhasePerformanceProps {
  duty: DutyAnalysis;
}

interface PhaseData {
  phase: FlightPhase;
  label: string;
  icon: string;
  performance: number;
  isCritical: boolean;
}

const phaseConfig: Record<FlightPhase, { label: string; icon: string; critical: boolean }> = {
  preflight: { label: 'Pre-flight', icon: '📋', critical: false },
  taxi: { label: 'Taxi', icon: '🛞', critical: false },
  takeoff: { label: 'Takeoff', icon: '🛫', critical: true },
  climb: { label: 'Climb', icon: '📈', critical: false },
  cruise: { label: 'Cruise', icon: '✈️', critical: false },
  descent: { label: 'Descent', icon: '📉', critical: false },
  approach: { label: 'Approach', icon: '🎯', critical: true },
  landing: { label: 'Landing', icon: '🛬', critical: true },
};

const getPerformanceColor = (performance: number): string => {
  if (performance >= 70) return 'bg-success';
  if (performance >= 60) return 'bg-warning';
  if (performance >= 50) return 'bg-high';
  return 'bg-critical';
};

const getPerformanceTextColor = (performance: number): string => {
  if (performance >= 70) return 'text-success';
  if (performance >= 60) return 'text-warning';
  if (performance >= 50) return 'text-high';
  return 'text-critical';
};

export function FlightPhasePerformance({ duty }: FlightPhasePerformanceProps) {
  // Generate phase performance data - if not available from backend, simulate it
  const phasePerformance: PhaseData[] = duty.phasePerformance?.map(pp => ({
    phase: pp.phase,
    label: phaseConfig[pp.phase].label,
    icon: phaseConfig[pp.phase].icon,
    performance: pp.performance,
    isCritical: pp.isCritical,
  })) || [
    // Simulated based on overall duty performance with realistic variations
    { phase: 'preflight' as FlightPhase, label: 'Pre-flight', icon: '📋', performance: duty.avgPerformance + 5, isCritical: false },
    { phase: 'taxi' as FlightPhase, label: 'Taxi', icon: '🛞', performance: duty.avgPerformance + 3, isCritical: false },
    { phase: 'takeoff' as FlightPhase, label: 'Takeoff', icon: '🛫', performance: duty.avgPerformance + 2, isCritical: true },
    { phase: 'climb' as FlightPhase, label: 'Climb', icon: '📈', performance: duty.avgPerformance, isCritical: false },
    { phase: 'cruise' as FlightPhase, label: 'Cruise', icon: '✈️', performance: duty.avgPerformance - 2, isCritical: false },
    { phase: 'descent' as FlightPhase, label: 'Descent', icon: '📉', performance: duty.minPerformance + 5, isCritical: false },
    { phase: 'approach' as FlightPhase, label: 'Approach', icon: '🎯', performance: duty.minPerformance + 2, isCritical: true },
    { phase: 'landing' as FlightPhase, label: 'Landing', icon: '🛬', performance: duty.landingPerformance, isCritical: true },
  ];

  // Clamp performance values
  const clampedPhases = phasePerformance.map(p => ({
    ...p,
    performance: Math.max(0, Math.min(100, p.performance)),
  }));

  const criticalPhases = clampedPhases.filter(p => p.isCritical);
  const lowestCritical = criticalPhases.reduce((a, b) => 
    a.performance < b.performance ? a : b
  , criticalPhases[0]);

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            Flight Phase Performance Breakdown
          </span>
          {lowestCritical && lowestCritical.performance < 60 && (
            <Badge variant="critical" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {lowestCritical.label}: {lowestCritical.performance.toFixed(0)}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clampedPhases.map((phase) => (
            <div key={phase.phase} className="flex items-center gap-3">
              {/* Phase label */}
              <div className={`flex items-center gap-2 w-28 ${phase.isCritical ? 'font-medium' : ''}`}>
                <span>{phase.icon}</span>
                <span className="text-sm">{phase.label}</span>
                {phase.isCritical && (
                  <span className="text-[10px] text-critical">●</span>
                )}
              </div>
              
              {/* Progress bar */}
              <div className="flex-1 h-6 bg-secondary/50 rounded-full overflow-hidden relative">
                <div
                  className={`h-full ${getPerformanceColor(phase.performance)} transition-all duration-500`}
                  style={{ width: `${phase.performance}%` }}
                />
                {/* Reference lines */}
                <div className="absolute top-0 bottom-0 left-[50%] w-px bg-critical/50" />
                <div className="absolute top-0 bottom-0 left-[70%] w-px bg-success/50" />
              </div>
              
              {/* Score */}
              <div className={`w-14 text-right text-sm font-mono ${getPerformanceTextColor(phase.performance)}`}>
                {phase.performance.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="text-critical">●</span>
              Critical Phase
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" />
              70%+
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning" />
              60-70%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-critical" />
              &lt;60%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
