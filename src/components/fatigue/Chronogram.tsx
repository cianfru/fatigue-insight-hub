import { useState, useMemo } from 'react';
import { Info, AlertTriangle, Battery } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DutyAnalysis, DutyStatistics } from '@/types/fatigue';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

// Helper to calculate recovery score from sleep estimate
const getRecoveryScore = (estimate: NonNullable<DutyAnalysis['sleepEstimate']>): number => {
  const baseScore = (estimate.effectiveSleepHours / 8) * 100;
  const efficiencyBonus = estimate.sleepEfficiency * 20;
  const woclPenalty = estimate.woclOverlapHours * 5;
  return Math.min(100, Math.max(0, baseScore + efficiencyBonus - woclPenalty));
};

const getRecoveryClasses = (score: number): { border: string; bg: string; text: string } => {
  // Use semantic design tokens (no hard-coded Tailwind colors).
  if (score >= 80) return { border: 'border-success', bg: 'bg-success/10', text: 'text-success' };
  if (score >= 65) return { border: 'border-success/70', bg: 'bg-success/10', text: 'text-success/80' };
  if (score >= 50) return { border: 'border-warning', bg: 'bg-warning/10', text: 'text-warning' };
  if (score >= 35) return { border: 'border-high', bg: 'bg-high/10', text: 'text-high' };
  return { border: 'border-critical', bg: 'bg-critical/10', text: 'text-critical' };
};

const getStrategyIcon = (strategy: string): string => {
  switch (strategy) {
    case 'anchor': return '⚓';
    case 'split': return '✂️';
    case 'nap': return '💤';
    case 'extended': return '🛏️';
    case 'restricted': return '⏰';
    case 'recovery': return '🔋';
    default: return '😴';
  }
};

interface ChronogramProps {
  duties: DutyAnalysis[];
  statistics: DutyStatistics;
  month: Date;
  pilotId: string;
  pilotName?: string;
  pilotBase?: string;
  pilotAircraft?: string;
  onDutySelect: (duty: DutyAnalysis) => void;
  selectedDuty: DutyAnalysis | null;
}

type DisplayMode = 'heatmap' | 'timeline' | 'combined';

// Check-in time before first sector (EASA typically 60 min)
const CHECK_IN_MINUTES = 60;

interface FlightSegmentBar {
  type: 'checkin' | 'flight' | 'ground';
  flightNumber?: string;
  departure?: string;
  arrival?: string;
  startHour: number;
  endHour: number;
  performance: number;
}

interface DutyBar {
  dayIndex: number;
  startHour: number; // FDP start (check-in time)
  endHour: number;
  duty: DutyAnalysis;
  isOvernightContinuation?: boolean;
  segments: FlightSegmentBar[]; // Individual flight segments
}

interface SleepBar {
  dayIndex: number;
  startHour: number;
  endHour: number;
  recoveryScore: number;
  effectiveSleep: number;
  sleepEfficiency: number;
  sleepStrategy: string;
  isPreDuty: boolean; // Sleep before the duty on this day
  relatedDuty: DutyAnalysis;
}

// WOCL (Window of Circadian Low) is typically 02:00 - 06:00
const WOCL_START = 2;
const WOCL_END = 6;

const getPerformanceColor = (performance: number): string => {
  // Create gradient from red (0) to yellow (50) to green (100)
  if (performance >= 80) return 'hsl(120, 70%, 45%)'; // Green
  if (performance >= 70) return 'hsl(90, 70%, 50%)'; // Yellow-green
  if (performance >= 60) return 'hsl(55, 90%, 55%)'; // Yellow
  if (performance >= 50) return 'hsl(40, 95%, 50%)'; // Orange-yellow
  if (performance >= 40) return 'hsl(25, 95%, 50%)'; // Orange
  return 'hsl(0, 80%, 50%)'; // Red
};

export function Chronogram({ duties, statistics, month, pilotId, pilotName, pilotBase, pilotAircraft, onDutySelect, selectedDuty }: ChronogramProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('heatmap');
  const [infoOpen, setInfoOpen] = useState(false);

  // Count duties with commander discretion
  const discretionCount = useMemo(() => 
    duties.filter(d => d.usedDiscretion).length
  , [duties]);

  const daysInMonth = getDaysInMonth(month);
  const monthStart = startOfMonth(month);

  // Get only days that have duties (will be populated after dutyBars are computed)
  const allDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
  }, [daysInMonth, monthStart]);

  // Days that have actual duties
  const dutyDays = useMemo(() => {
    const dutyDayIndices = new Set<number>();
    duties.forEach((duty) => {
      dutyDayIndices.add(duty.date.getDate());
      // Also include next day for overnight duties
      if (duty.flightSegments.length > 0) {
        const lastSegment = duty.flightSegments[duty.flightSegments.length - 1];
        const firstSegment = duty.flightSegments[0];
        const [startH] = firstSegment.departureTime.split(':').map(Number);
        const [endH] = lastSegment.arrivalTime.split(':').map(Number);
        if (endH < startH && duty.date.getDate() < daysInMonth) {
          dutyDayIndices.add(duty.date.getDate() + 1);
        }
      }
    });
    return Array.from(dutyDayIndices).sort((a, b) => a - b).map(dayNum => addDays(monthStart, dayNum - 1));
  }, [duties, daysInMonth, monthStart]);

  // Calculate flight segment bars for a duty
  const calculateSegments = (duty: DutyAnalysis, isOvernightContinuation: boolean): FlightSegmentBar[] => {
    const segments: FlightSegmentBar[] = [];
    const flightSegs = duty.flightSegments;
    if (flightSegs.length === 0) return [];
    
    // For overnight continuation, we only show segments that fall after midnight
    if (isOvernightContinuation) {
      // Find segments that are after midnight
      flightSegs.forEach((seg, index) => {
        const [depH, depM] = seg.departureTime.split(':').map(Number);
        const [arrH, arrM] = seg.arrivalTime.split(':').map(Number);
        const depHour = depH + depM / 60;
        const arrHour = arrH + arrM / 60;
        
        // If departure is before midnight but arrival is after, or both are low hours (after midnight)
        if (arrHour < 12 && (index > 0 || depHour < 12)) {
          segments.push({
            type: 'flight',
            flightNumber: seg.flightNumber,
            departure: seg.departure,
            arrival: seg.arrival,
            startHour: depHour,
            endHour: arrHour,
            performance: seg.performance,
          });
        }
      });
      return segments;
    }
    
    // Get first departure for check-in calculation
    const [firstDepH, firstDepM] = flightSegs[0].departureTime.split(':').map(Number);
    const firstDepHour = firstDepH + firstDepM / 60;
    const checkInHour = Math.max(0, firstDepHour - CHECK_IN_MINUTES / 60);
    
    // Add check-in segment
    segments.push({
      type: 'checkin',
      startHour: checkInHour,
      endHour: firstDepHour,
      performance: Math.min(100, duty.avgPerformance + 10), // Higher at start
    });
    
    // Add each flight segment
    flightSegs.forEach((seg, index) => {
      const [depH, depM] = seg.departureTime.split(':').map(Number);
      const [arrH, arrM] = seg.arrivalTime.split(':').map(Number);
      const depHour = depH + depM / 60;
      let arrHour = arrH + arrM / 60;
      
      // Handle overnight: if arrival is before departure, it's the next day
      if (arrHour < depHour) {
        arrHour = 24; // Cap at midnight for this day's bar
      }
      
      // Add ground time between flights if there's a gap
      if (index > 0) {
        const prevSeg = flightSegs[index - 1];
        const [prevArrH, prevArrM] = prevSeg.arrivalTime.split(':').map(Number);
        let prevArrHour = prevArrH + prevArrM / 60;
        
        // Skip ground time if previous flight was overnight
        if (prevArrHour > depHour) {
          prevArrHour = 0; // Reset for overnight continuation
        }
        
        if (depHour > prevArrHour + 0.25) { // More than 15 min gap
          segments.push({
            type: 'ground',
            startHour: prevArrHour,
            endHour: depHour,
            performance: duty.avgPerformance,
          });
        }
      }
      
      segments.push({
        type: 'flight',
        flightNumber: seg.flightNumber,
        departure: seg.departure,
        arrival: seg.arrival,
        startHour: depHour,
        endHour: arrHour,
        performance: seg.performance,
      });
    });
    
    return segments;
  };

  // Convert duties to bar positions with individual flight segments
  const dutyBars = useMemo(() => {
    const bars: DutyBar[] = [];
    
    duties.forEach((duty) => {
      const dayOfMonth = duty.date.getDate();
      
      // Calculate start and end times from flight segments
      if (duty.flightSegments.length > 0) {
        const firstSegment = duty.flightSegments[0];
        const lastSegment = duty.flightSegments[duty.flightSegments.length - 1];
        
        const [startH, startM] = firstSegment.departureTime.split(':').map(Number);
        const [endH, endM] = lastSegment.arrivalTime.split(':').map(Number);
        
        // FDP starts at check-in (before first departure)
        const checkInHour = Math.max(0, startH + startM / 60 - CHECK_IN_MINUTES / 60);
        let endHour = endH + endM / 60;
        
        // Handle overnight duties
        if (endHour < checkInHour || endHour < (startH + startM / 60)) {
          // First bar: from check-in to midnight
          bars.push({
            dayIndex: dayOfMonth,
            startHour: checkInHour,
            endHour: 24,
            duty,
            segments: calculateSegments(duty, false),
          });
          // Second bar: from midnight to end (next day)
          if (dayOfMonth < daysInMonth) {
            bars.push({
              dayIndex: dayOfMonth + 1,
              startHour: 0,
              endHour,
              duty,
              isOvernightContinuation: true,
              segments: calculateSegments(duty, true),
            });
          }
        } else {
          bars.push({
            dayIndex: dayOfMonth,
            startHour: checkInHour,
            endHour,
            duty,
            segments: calculateSegments(duty, false),
          });
        }
      }
    });
    
    return bars;
  }, [duties, daysInMonth]);

  // Calculate sleep/rest period bars showing recovery using backend timing
  const sleepBars = useMemo(() => {
    const bars: SleepBar[] = [];
    
    // Helper to parse HH:mm to decimal hours
    const parseTime = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return h + (m || 0) / 60;
    };
    
    duties.forEach((duty) => {
      const dayOfMonth = duty.date.getDate();
      const sleepEstimate = duty.sleepEstimate;

      if (!sleepEstimate) return;

      const recoveryScore = getRecoveryScore(sleepEstimate);
      
      // Use backend-provided sleep times if available
      const sleepStart = sleepEstimate.sleepStartTime ? parseTime(sleepEstimate.sleepStartTime) : null;
      const sleepEnd = sleepEstimate.sleepEndTime ? parseTime(sleepEstimate.sleepEndTime) : null;
      
      if (sleepStart !== null && sleepEnd !== null) {
        // Backend provides actual sleep timing
        if (sleepStart > sleepEnd) {
          // Overnight sleep: spans midnight (e.g., 23:00 to 06:00)
          // Part 1: sleepStart to 24:00 on previous day
          if (dayOfMonth > 1) {
            bars.push({
              dayIndex: dayOfMonth - 1,
              startHour: sleepStart,
              endHour: 24,
              recoveryScore,
              effectiveSleep: sleepEstimate.effectiveSleepHours,
              sleepEfficiency: sleepEstimate.sleepEfficiency,
              sleepStrategy: sleepEstimate.sleepStrategy,
              isPreDuty: true,
              relatedDuty: duty,
            });
          }
          // Part 2: 00:00 to sleepEnd on duty day
          bars.push({
            dayIndex: dayOfMonth,
            startHour: 0,
            endHour: sleepEnd,
            recoveryScore,
            effectiveSleep: sleepEstimate.effectiveSleepHours,
            sleepEfficiency: sleepEstimate.sleepEfficiency,
            sleepStrategy: sleepEstimate.sleepStrategy,
            isPreDuty: true,
            relatedDuty: duty,
          });
        } else {
          // Same-day sleep (e.g., afternoon nap 14:00 to 16:00)
          bars.push({
            dayIndex: dayOfMonth,
            startHour: sleepStart,
            endHour: sleepEnd,
            recoveryScore,
            effectiveSleep: sleepEstimate.effectiveSleepHours,
            sleepEfficiency: sleepEstimate.sleepEfficiency,
            sleepStrategy: sleepEstimate.sleepStrategy,
            isPreDuty: true,
            relatedDuty: duty,
          });
        }
      } else {
        // Fallback: estimate sleep window from total hours if no timing provided
        // Place sleep ending ~1.5h before duty start
        if (duty.flightSegments.length > 0) {
          const firstSeg = duty.flightSegments[0];
          const [depH, depM] = firstSeg.departureTime.split(':').map(Number);
          const dutyStart = depH + depM / 60;
          const sleepDuration = sleepEstimate.totalSleepHours;
          
          // Estimate wake time as 1.5h before duty
          const wakeTime = Math.max(0, dutyStart - 1.5);
          // Estimate sleep start based on duration
          let estimatedSleepStart = wakeTime - sleepDuration;
          
          if (estimatedSleepStart < 0) {
            // Sleep started previous day
            estimatedSleepStart += 24;
            if (dayOfMonth > 1) {
              bars.push({
                dayIndex: dayOfMonth - 1,
                startHour: estimatedSleepStart,
                endHour: 24,
                recoveryScore,
                effectiveSleep: sleepEstimate.effectiveSleepHours,
                sleepEfficiency: sleepEstimate.sleepEfficiency,
                sleepStrategy: sleepEstimate.sleepStrategy,
                isPreDuty: true,
                relatedDuty: duty,
              });
            }
            if (wakeTime > 0) {
              bars.push({
                dayIndex: dayOfMonth,
                startHour: 0,
                endHour: wakeTime,
                recoveryScore,
                effectiveSleep: sleepEstimate.effectiveSleepHours,
                sleepEfficiency: sleepEstimate.sleepEfficiency,
                sleepStrategy: sleepEstimate.sleepStrategy,
                isPreDuty: true,
                relatedDuty: duty,
              });
            }
          } else {
            // Same-day sleep
            bars.push({
              dayIndex: dayOfMonth,
              startHour: estimatedSleepStart,
              endHour: wakeTime,
              recoveryScore,
              effectiveSleep: sleepEstimate.effectiveSleepHours,
              sleepEfficiency: sleepEstimate.sleepEfficiency,
              sleepStrategy: sleepEstimate.sleepStrategy,
              isPreDuty: true,
              relatedDuty: duty,
            });
          }
        }
      }
    });
    
    return bars;
  }, [duties]);

  // Get duty warnings based on actual duty data
  const getDayWarnings = (dayOfMonth: number) => {
    const duty = duties.find(d => d.date.getDate() === dayOfMonth);
    if (!duty) return null;
    
    const warnings: string[] = [];
    
    // WOCL exposure warning (hours in Window of Circadian Low)
    if (duty.woclExposure > 0) {
      warnings.push(`WOCL ${duty.woclExposure.toFixed(1)}h`);
    }
    
    // Prior sleep / FLIP warning (Flight time Limitation Period)
    if (duty.priorSleep < 8) {
      warnings.push(`Sleep ${duty.priorSleep.toFixed(1)}h`);
    }
    
    // Low performance warning
    if (duty.minPerformance < 60) {
      warnings.push(`Perf ${Math.round(duty.minPerformance)}%`);
    }
    
    // Sleep debt warning
    if (duty.sleepDebt > 4) {
      warnings.push(`Debt ${duty.sleepDebt.toFixed(1)}h`);
    }
    
    return {
      warnings,
      risk: duty.overallRisk,
    };
  };

  const hours = Array.from({ length: 8 }, (_, i) => i * 3); // 00, 03, 06, 09, 12, 15, 18, 21

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="text-primary">📊</span>
          Monthly Chronogram - High-Resolution Timeline
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          30-minute resolution showing duty timing, WOCL exposure, and fatigue patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display Mode Selector */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Display Mode</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={displayMode === 'heatmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('heatmap')}
              className="text-xs"
            >
              🎨 Performance Heatmap (shows fatigue levels)
            </Button>
            <Button
              variant={displayMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('timeline')}
              className="text-xs"
            >
              📊 Duty/Rest Timeline (simple)
            </Button>
            <Button
              variant={displayMode === 'combined' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('combined')}
              className="text-xs"
            >
              🔄 Combined View
            </Button>
          </div>
        </div>

        {/* Info Collapsible */}
        <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Info className="mr-1 h-3 w-3" />
              How to Read This Chart
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground">
              <p className="mb-2">The chart shows duty periods across the month. Colors indicate fatigue level (performance score):</p>
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(120, 70%, 45%)' }} /> 80-100% (Good)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(55, 90%, 55%)' }} /> 60-80% (Moderate)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(25, 95%, 50%)' }} /> 40-60% (High Risk)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(0, 80%, 50%)' }} /> &lt;40% (Critical)</span>
              </div>
              <p className="mt-2">Purple shaded area = WOCL (Window of Circadian Low: 02:00-06:00)</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* High-Resolution Timeline */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[800px]">
            {/* Header with pilot info */}
            <div className="mb-4 text-center">
              {pilotName && (
                <h2 className="text-lg font-semibold text-foreground">{pilotName}</h2>
              )}
              <div className="text-sm text-muted-foreground">
                {pilotBase && pilotAircraft ? (
                  <span>{pilotBase} | {pilotAircraft}</span>
                ) : (
                  <span>Pilot: {pilotId}</span>
                )}
              </div>
              <div className="mt-1 text-sm font-medium">
                {format(month, 'MMMM yyyy')} - High-Resolution Duty Timeline
              </div>
            </div>
            
            {/* Stats row */}
            <div className="mb-4 flex items-center justify-center gap-4 text-xs flex-wrap">
              <span>Duties: <strong>{statistics.totalDuties}</strong></span>
              <span>High Risk: <strong className="text-high">{statistics.highRiskDuties}</strong></span>
              <span>Critical: <strong className="text-critical">{statistics.criticalRiskDuties}</strong></span>
              {discretionCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {discretionCount} Discretion Used
                </Badge>
              )}
            </div>
            
            {/* Legend */}
            <div className="mb-4 flex items-center justify-center gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-2">
                <span className="h-4 w-8 rounded bg-wocl/30" />
                WOCL
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">|</span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-6 rounded opacity-70" style={{ backgroundColor: 'hsl(120, 70%, 45%)' }} />
                Check-in
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-6 rounded" style={{ backgroundColor: 'hsl(120, 70%, 45%)' }} />
                ✈️ Flight
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-6 rounded bg-muted opacity-50" />
                Ground
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">|</span>
              <span className="flex items-center gap-1">
                <span 
                  className="h-3 w-6 rounded border border-dashed" 
                  style={{ 
                    backgroundColor: 'hsl(120, 70%, 45%, 0.15)',
                    borderColor: 'hsl(120, 70%, 45%)'
                  }} 
                />
                🛏️ Sleep/Recovery
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">|</span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded border-2 border-dashed border-muted-foreground" />
                FDP Limit
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-critical ring-2 ring-critical/50" />
                Discretion
              </span>
            </div>

            {/* Timeline Grid */}
            <div className="flex">
              {/* Y-axis labels (all days of month) */}
              <div className="w-32 flex-shrink-0">
                <div className="h-8" /> {/* Header spacer */}
                {allDays.map((day) => {
                  const dayNum = day.getDate();
                  const dayWarnings = getDayWarnings(dayNum);
                  const hasDuty = dutyBars.some(bar => bar.dayIndex === dayNum);
                  return (
                    <div
                      key={dayNum}
                      className={cn(
                        "relative flex h-7 items-center gap-1 pr-2 text-xs",
                        !hasDuty && "opacity-50"
                      )}
                    >
                      <div className="flex flex-col items-start min-w-[60px]">
                        {dayWarnings && dayWarnings.warnings.length > 0 && (
                          <span className={cn(
                            "text-[8px] leading-tight truncate max-w-[60px]",
                            dayWarnings.risk === 'CRITICAL' && "text-critical",
                            dayWarnings.risk === 'HIGH' && "text-high",
                            dayWarnings.risk === 'MODERATE' && "text-warning",
                            dayWarnings.risk === 'LOW' && "text-muted-foreground"
                          )}>
                            ⚠ {dayWarnings.warnings[0]}
                          </span>
                        )}
                        {dayWarnings && dayWarnings.warnings.length > 1 && (
                          <span className={cn(
                            "text-[8px] leading-tight truncate max-w-[60px]",
                            dayWarnings.risk === 'CRITICAL' && "text-critical",
                            dayWarnings.risk === 'HIGH' && "text-high",
                            dayWarnings.risk === 'MODERATE' && "text-warning",
                            dayWarnings.risk === 'LOW' && "text-muted-foreground"
                          )}>
                            ⚠ {dayWarnings.warnings[1]}
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "ml-auto font-medium",
                        hasDuty ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {format(day, 'EEE d')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Main chart area */}
              <div className="relative flex-1">
                {/* X-axis header */}
                <div className="flex h-8 border-b border-border">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 text-center text-[10px] text-muted-foreground"
                      style={{ width: `${(3/24) * 100}%` }}
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Grid with WOCL shading and duty bars */}
                <div className="relative">
                  {/* WOCL shading */}
                  <div
                    className="absolute top-0 bottom-0 bg-wocl/20"
                    style={{
                      left: `${(WOCL_START / 24) * 100}%`,
                      width: `${((WOCL_END - WOCL_START) / 24) * 100}%`,
                    }}
                  />

                  {/* Grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div
                        key={hour}
                        className={cn(
                          "flex-1 border-r",
                          hour % 3 === 0 ? "border-border/50" : "border-border/20"
                        )}
                      />
                    ))}
                  </div>

                  {/* Day rows (all days of month) */}
                  {allDays.map((day) => {
                    const dayNum = day.getDate();
                    return (
                      <div
                        key={dayNum}
                        className="relative h-7 border-b border-border/20"
                      >
                        {/* Sleep/Rest bars for this day showing recovery */}
                        {sleepBars
                          .filter((bar) => bar.dayIndex === dayNum)
                          .map((bar, barIndex) => {
                            const barWidth = ((bar.endHour - bar.startHour) / 24) * 100;
                             const classes = getRecoveryClasses(bar.recoveryScore);
                            return (
                              <TooltipProvider key={`sleep-${barIndex}`} delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "absolute z-0 rounded-sm flex items-center justify-end px-1 border border-dashed cursor-default",
                                        classes.border,
                                        classes.bg
                                      )}
                                      style={{
                                        top: 2,
                                        height: 10,
                                        left: `${(bar.startHour / 24) * 100}%`,
                                        width: `${Math.max(barWidth, 1)}%`,
                                      }}
                                    >
                                      {/* Show recovery info if bar is wide enough */}
                                      {barWidth > 6 && (
                                        <div 
                                          className={cn("flex items-center gap-0.5 text-[8px] font-medium", classes.text)}
                                        >
                                          <span>{getStrategyIcon(bar.sleepStrategy)}</span>
                                          <span>{Math.round(bar.recoveryScore)}%</span>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs p-2">
                                    <div className="space-y-1 text-xs">
                                      <div className="font-semibold flex items-center gap-1">
                                        🛏️ Sleep Period
                                        <span className="text-muted-foreground font-normal">
                                          ({bar.startHour.toFixed(0).padStart(2, '0')}:00 - {bar.endHour.toFixed(0).padStart(2, '0')}:00)
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                        <span className="text-muted-foreground">Recovery Score:</span>
                                        <span className={cn("font-medium", classes.text)}>
                                          {Math.round(bar.recoveryScore)}%
                                        </span>
                                        <span className="text-muted-foreground">Effective Sleep:</span>
                                        <span>{bar.effectiveSleep.toFixed(1)}h</span>
                                        <span className="text-muted-foreground">Efficiency:</span>
                                        <span>{Math.round(bar.sleepEfficiency * 100)}%</span>
                                        <span className="text-muted-foreground">Strategy:</span>
                                        <span className="capitalize">{getStrategyIcon(bar.sleepStrategy)} {bar.sleepStrategy}</span>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                        Pre-duty rest for {format(bar.relatedDuty.date, 'MMM d')} duty
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}

                        {/* Duty bars for this day with flight phase segments */}
                        {dutyBars
                          .filter((bar) => bar.dayIndex === dayNum)
                          .map((bar, barIndex) => {
                            const usedDiscretion = bar.duty.usedDiscretion;
                            const maxFdp = bar.duty.maxFdpHours;
                            const actualFdp = bar.duty.actualFdpHours || bar.duty.dutyHours;
                            
                            return (
                              <TooltipProvider key={barIndex} delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => onDutySelect(bar.duty)}
                                      className={cn(
                                        "absolute z-10 rounded-sm transition-all hover:ring-2 cursor-pointer overflow-hidden flex",
                                        selectedDuty?.date.getTime() === bar.duty.date.getTime() && "ring-2 ring-foreground",
                                        usedDiscretion ? "ring-2 ring-critical hover:ring-critical/80" : "hover:ring-foreground"
                                      )}
                                      style={{
                                        top: 14,
                                        height: 12,
                                        left: `${(bar.startHour / 24) * 100}%`,
                                        width: `${Math.max(((bar.endHour - bar.startHour) / 24) * 100, 2)}%`,
                                        background: displayMode === 'timeline' ? 'hsl(var(--primary))' : undefined,
                                      }}
                                      >
                                        {/* Render individual flight segments */}
                                        {displayMode !== 'timeline' && bar.segments.map((segment, segIndex) => {
                                          const segmentWidth = ((segment.endHour - segment.startHour) / (bar.endHour - bar.startHour)) * 100;
                                          return (
                                            <div
                                              key={segIndex}
                                              className={cn(
                                                "h-full relative flex items-center justify-center",
                                                segment.type === 'checkin' && "opacity-70",
                                                segment.type === 'ground' && "opacity-50"
                                              )}
                                              style={{
                                                width: `${segmentWidth}%`,
                                                backgroundColor: segment.type === 'ground' 
                                                  ? 'hsl(var(--muted))' 
                                                  : getPerformanceColor(segment.performance),
                                              }}
                                            >
                                              {/* Segment separator line */}
                                              {segIndex > 0 && (
                                                <div className="absolute left-0 top-0 bottom-0 w-px bg-background/70" />
                                              )}
                                              {/* Flight number label for flights */}
                                              {segment.type === 'flight' && segment.flightNumber && segmentWidth > 8 && (
                                                <span className="text-[8px] font-medium text-background truncate px-0.5">
                                                  {segment.flightNumber}
                                                </span>
                                              )}
                                              {/* Check-in indicator */}
                                              {segment.type === 'checkin' && segmentWidth > 5 && (
                                                <span className="text-[8px] text-background/80">✓</span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      {/* Sleep Recovery Badge - visible on bar */}
                                      {bar.duty.sleepEstimate && !bar.isOvernightContinuation && (
                                        (() => {
                                          const recoveryScore = getRecoveryScore(bar.duty.sleepEstimate);
                                          const classes = getRecoveryClasses(recoveryScore);
                                          const barWidthPercent = ((bar.endHour - bar.startHour) / 24) * 100;
                                          // Only show if bar is wide enough (>10% of timeline)
                                          if (barWidthPercent < 10) return null;
                                          return (
                                            <div 
                                              className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm"
                                              style={{ fontSize: '9px' }}
                                            >
                                              <span>{getStrategyIcon(bar.duty.sleepEstimate.sleepStrategy)}</span>
                                              <span className={cn("font-semibold", classes.text)}>
                                                {Math.round(recoveryScore)}%
                                              </span>
                                            </div>
                                          );
                                        })()
                                      )}
                                      {/* Discretion warning indicator */}
                                      {usedDiscretion && (
                                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-critical flex items-center justify-center">
                                          <AlertTriangle className="h-2 w-2 text-critical-foreground" />
                                        </div>
                                      )}
                                    </button>
                                  </TooltipTrigger>

                                  {/* FDP Limit indicator (dashed line at max FDP end) */}
                                  {maxFdp && !bar.isOvernightContinuation && (
                                    <div
                                      className="absolute top-0 bottom-0 border-r-2 border-dashed border-muted-foreground/50 pointer-events-none"
                                      style={{
                                        left: `${((bar.startHour + maxFdp) / 24) * 100}%`,
                                      }}
                                      title={`Max FDP: ${maxFdp}h`}
                                    />
                                  )}
                                  <TooltipContent side="right" className="max-w-xs p-3">
                                    <div className="space-y-2 text-xs">
                                      <div className={cn(
                                        "font-semibold text-sm border-b pb-1 flex items-center justify-between",
                                        usedDiscretion ? "border-critical" : "border-border"
                                      )}>
                                        <span>
                                          {format(bar.duty.date, 'EEEE, MMM d')} {bar.isOvernightContinuation && '(continued)'}
                                        </span>
                                        {usedDiscretion && (
                                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                            DISCRETION
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <span className="text-muted-foreground">Flights:</span>
                                        <span>{bar.duty.flightSegments.map(s => s.flightNumber).join(', ')}</span>
                                      </div>
                                      
                                      {/* EASA ORO.FTL Section */}
                                      {(maxFdp || bar.duty.extendedFdpHours) && (
                                        <div className="border-t border-border pt-2 mt-2">
                                          <span className="text-muted-foreground font-medium">EASA ORO.FTL:</span>
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                            {maxFdp && (
                                              <>
                                                <span className="text-muted-foreground">Max FDP:</span>
                                                <span>{maxFdp.toFixed(1)}h</span>
                                              </>
                                            )}
                                            {bar.duty.extendedFdpHours && (
                                              <>
                                                <span className="text-muted-foreground">Extended FDP:</span>
                                                <span className="text-warning">{bar.duty.extendedFdpHours.toFixed(1)}h</span>
                                              </>
                                            )}
                                            <span className="text-muted-foreground">Actual FDP:</span>
                                            <span className={cn(
                                              maxFdp && actualFdp > maxFdp && "text-critical font-medium",
                                              maxFdp && actualFdp <= maxFdp && "text-success"
                                            )}>
                                              {actualFdp.toFixed(1)}h
                                            </span>
                                            {bar.duty.fdpExceedance && bar.duty.fdpExceedance > 0 && (
                                              <>
                                                <span className="text-muted-foreground">Exceedance:</span>
                                                <span className="text-critical font-medium">+{bar.duty.fdpExceedance.toFixed(1)}h</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Flight Segments */}
                                      <div className="border-t border-border pt-2 mt-2">
                                        <span className="text-muted-foreground font-medium">Flight Segments:</span>
                                        <div className="flex flex-col gap-1 mt-1">
                                          {bar.segments.filter(s => s.type === 'flight').map((segment, i) => (
                                            <div key={i} className="flex items-center justify-between text-[10px] p-1 rounded" style={{ backgroundColor: `${getPerformanceColor(segment.performance)}20` }}>
                                              <span className="font-medium">{segment.flightNumber}</span>
                                              <span className="text-muted-foreground">{segment.departure} → {segment.arrival}</span>
                                              <span style={{ color: getPerformanceColor(segment.performance) }} className="font-medium">{Math.round(segment.performance)}%</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-2">
                                        <span className="text-muted-foreground">Min Perf:</span>
                                        <span style={{ color: getPerformanceColor(bar.duty.minPerformance) }}>{Math.round(bar.duty.minPerformance)}%</span>
                                        <span className="text-muted-foreground">WOCL Exposure:</span>
                                        <span className={bar.duty.woclExposure > 0 ? "text-warning" : ""}>{bar.duty.woclExposure.toFixed(1)}h</span>
                                        <span className="text-muted-foreground">Prior Sleep:</span>
                                        <span className={bar.duty.priorSleep < 8 ? "text-warning" : ""}>{bar.duty.priorSleep.toFixed(1)}h</span>
                                        <span className="text-muted-foreground">Sleep Debt:</span>
                                        <span className={bar.duty.sleepDebt > 4 ? "text-high" : ""}>{bar.duty.sleepDebt.toFixed(1)}h</span>
                                        <span className="text-muted-foreground">Risk Level:</span>
                                        <span className={cn(
                                          bar.duty.overallRisk === 'LOW' && "text-success",
                                          bar.duty.overallRisk === 'MODERATE' && "text-warning",
                                          bar.duty.overallRisk === 'HIGH' && "text-high",
                                          bar.duty.overallRisk === 'CRITICAL' && "text-critical"
                                        )}>{bar.duty.overallRisk}</span>
                                      </div>
                                      
                                      {/* Sleep Recovery Section */}
                                      {bar.duty.sleepEstimate && (
                                        <div className="border-t border-border pt-2 mt-2">
                                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                                            <Battery className="h-3 w-3" />
                                            Sleep Recovery
                                          </span>
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                            <span className="text-muted-foreground">Recovery Score:</span>
                                            {(() => {
                                              const score = getRecoveryScore(bar.duty.sleepEstimate);
                                              const classes = getRecoveryClasses(score);
                                              return (
                                                <span className={cn("font-medium", classes.text)}>
                                                  {Math.round(score)}%
                                                </span>
                                              );
                                            })()}
                                            <span className="text-muted-foreground">Effective Sleep:</span>
                                            <span>{bar.duty.sleepEstimate.effectiveSleepHours.toFixed(1)}h</span>
                                            <span className="text-muted-foreground">Efficiency:</span>
                                            <span>{Math.round(bar.duty.sleepEstimate.sleepEfficiency * 100)}%</span>
                                            <span className="text-muted-foreground">Strategy:</span>
                                            <span className="capitalize">{bar.duty.sleepEstimate.sleepStrategy}</span>
                                            {bar.duty.sleepEstimate.warnings.length > 0 && (
                                              <>
                                                <span className="text-muted-foreground col-span-2 text-warning text-[10px] mt-1">
                                                  ⚠️ {bar.duty.sleepEstimate.warnings[0]}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Color legend - aligned with chart height */}
              {displayMode !== 'timeline' && (
                <div className="ml-4 flex w-16 flex-shrink-0 flex-col">
                  <div className="h-8 text-[10px] text-muted-foreground text-center">Score</div>
                  <div className="flex gap-1" style={{ height: `${allDays.length * 28}px` }}>
                    {/* Gradient bar */}
                    <div className="w-3 rounded-sm overflow-hidden">
                      <div
                        className="h-full w-full"
                        style={{
                          background: 'linear-gradient(to bottom, hsl(120, 70%, 45%), hsl(90, 70%, 50%), hsl(55, 90%, 55%), hsl(40, 95%, 50%), hsl(25, 95%, 50%), hsl(0, 80%, 50%))',
                        }}
                      />
                    </div>
                    {/* Labels aligned with gradient */}
                    <div className="flex flex-col justify-between text-[9px] text-muted-foreground">
                      <span>100</span>
                      <span>80</span>
                      <span>60</span>
                      <span>40</span>
                      <span>20</span>
                      <span>0</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* X-axis label */}
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Time of Day (Home Base)
            </div>
          </div>
        </div>

        {/* Quick duty selection grid */}
        <div className="space-y-2 pt-4 border-t border-border">
          <h4 className="text-sm font-medium">Quick Duty Selection</h4>
          <div className="flex flex-wrap gap-2">
            {duties.map((duty, index) => (
              <button
                key={index}
                onClick={() => onDutySelect(duty)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 text-foreground",
                  duty.overallRisk === 'LOW' && "bg-success hover:bg-success/80",
                  duty.overallRisk === 'MODERATE' && "bg-warning hover:bg-warning/80",
                  duty.overallRisk === 'HIGH' && "bg-high hover:bg-high/80",
                  duty.overallRisk === 'CRITICAL' && "bg-critical hover:bg-critical/80",
                  selectedDuty?.date.getTime() === duty.date.getTime()
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : 'hover:scale-105'
                )}
              >
                {duty.dayOfWeek}, {format(duty.date, 'MMM dd')}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
