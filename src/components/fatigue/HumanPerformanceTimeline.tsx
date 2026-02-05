import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DutyAnalysis } from '@/types/fatigue';
import { format, parseISO, differenceInMinutes, startOfMonth, getDaysInMonth, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useChronogramZoom } from '@/hooks/useChronogramZoom';
import { Info, RotateCcw, Clock, Moon, Sun, Zap } from 'lucide-react';

interface HumanPerformanceTimelineProps {
  duties: DutyAnalysis[];
  month: Date;
  pilotName?: string;
  pilotBase?: string;
  onDutySelect: (duty: DutyAnalysis) => void;
  selectedDuty: DutyAnalysis | null;
}

// Circadian markers in biological time (hours from midnight of body clock reference)
const WOCL_START = 2;   // Window of Circadian Low start
const WOCL_END = 6;     // Window of Circadian Low end
const NADIR_HOUR = 4.5; // Core body temperature minimum (~04:30)
const WMZ_START = 20;   // Wakefulness Maintenance Zone start
const WMZ_END = 22;     // Wakefulness Maintenance Zone end

// Circadian adaptation rate (hours per day)
const ADAPTATION_RATE_EAST = 1.0;  // ~1h/day eastward
const ADAPTATION_RATE_WEST = 1.5;  // ~1.5h/day westward

// Performance color based on score
const getPerformanceColor = (performance: number): string => {
  if (performance >= 80) return 'hsl(120, 70%, 45%)';
  if (performance >= 70) return 'hsl(90, 70%, 50%)';
  if (performance >= 60) return 'hsl(55, 90%, 55%)';
  if (performance >= 50) return 'hsl(40, 95%, 50%)';
  if (performance >= 40) return 'hsl(25, 95%, 50%)';
  return 'hsl(0, 80%, 50%)';
};

// Get recovery color for sleep bars
const getRecoveryColor = (score: number): string => {
  if (score >= 80) return 'hsl(var(--success))';
  if (score >= 65) return 'hsl(var(--success) / 0.7)';
  if (score >= 50) return 'hsl(var(--warning))';
  if (score >= 35) return 'hsl(var(--high))';
  return 'hsl(var(--critical))';
};

// Get sleep strategy icon
const getStrategyIcon = (strategy: string): string => {
  switch (strategy) {
    case 'anchor': return '⚓';
    case 'split': return '✂️';
    case 'nap': return '💤';
    case 'afternoon_nap': return '☀️';
    case 'early_bedtime': return '🌙';
    case 'extended': return '🛏️';
    case 'recovery': return '🔋';
    default: return '😴';
  }
};

// Parse ISO timestamp to get hour of day (0-24)
const getHourFromIso = (iso: string): number => {
  try {
    const match = iso.match(/T(\d{2}):(\d{2})/);
    if (match) {
      return parseInt(match[1]) + parseInt(match[2]) / 60;
    }
    const date = parseISO(iso);
    return date.getUTCHours() + date.getUTCMinutes() / 60;
  } catch {
    return 0;
  }
};

// Calculate timezone offset between two airports (simplified - would need airport timezone data)
// For now, use circadianPhaseShift from duty data if available
const getTimezoneShift = (duty: DutyAnalysis): number => {
  return duty.circadianPhaseShift || 0;
};

// Calculate elapsed hours from a reference point
const getElapsedHours = (startDate: Date, currentDate: Date): number => {
  try {
    return differenceInMinutes(currentDate, startDate) / 60;
  } catch {
    return 0;
  }
};

interface ElapsedSegment {
  dayIndex: number;        // Day of month (1-31)
  startHour: number;       // Hour within day (0-24)
  endHour: number;         // Hour within day (0-24)
  type: 'checkin' | 'flight' | 'ground' | 'rest';
  flightNumber?: string;
  departure?: string;
  arrival?: string;
  performance: number;
  duty: DutyAnalysis;
  isOvernightStart?: boolean;
  isOvernightContinuation?: boolean;
}

interface SleepSegment {
  dayIndex: number;
  startHour: number;
  endHour: number;
  recoveryScore: number;
  effectiveSleep: number;
  sleepStrategy: string;
  relatedDuty: DutyAnalysis;
  isOvernightStart?: boolean;
  isOvernightContinuation?: boolean;
}

// Circadian phase for a given day based on accumulated timezone shifts
interface CircadianState {
  phaseShift: number;  // Hours shifted from home base (+ = east, - = west)
  woclStart: number;   // Adjusted WOCL start in local display time
  woclEnd: number;     // Adjusted WOCL end
  nadirHour: number;   // Adjusted nadir
  wmzStart: number;    // Adjusted WMZ start
  wmzEnd: number;      // Adjusted WMZ end
}

export function HumanPerformanceTimeline({
  duties,
  month,
  pilotName,
  pilotBase,
  onDutySelect,
  selectedDuty,
}: HumanPerformanceTimelineProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  
  const { zoom, containerRef, resetZoom, isZoomed } = useChronogramZoom({
    minScaleX: 1,
    maxScaleX: 4,
    minScaleY: 1,
    maxScaleY: 2,
  });

  const daysInMonth = getDaysInMonth(month);
  const monthStart = startOfMonth(month);

  // Calculate circadian state for each day of the month
  // This tracks body clock adaptation as pilot crosses timezones
  const circadianStates = useMemo(() => {
    const states: Map<number, CircadianState> = new Map();
    
    const sortedDuties = [...duties].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let currentPhaseShift = 0; // Hours shifted from home base
    let lastDutyDay = 0;

    // Initialize all days with home base circadian rhythm
    for (let day = 1; day <= daysInMonth; day++) {
      states.set(day, {
        phaseShift: 0,
        woclStart: WOCL_START,
        woclEnd: WOCL_END,
        nadirHour: NADIR_HOUR,
        wmzStart: WMZ_START,
        wmzEnd: WMZ_END,
      });
    }

    // Process duties to calculate phase shifts
    sortedDuties.forEach((duty) => {
      const dayOfMonth = duty.dateString 
        ? Number(duty.dateString.split('-')[2]) 
        : duty.date.getDate();
      
      // Apply adaptation on rest days between duties
      if (lastDutyDay > 0 && dayOfMonth > lastDutyDay + 1) {
        const restDays = dayOfMonth - lastDutyDay - 1;
        const adaptationRate = currentPhaseShift > 0 ? ADAPTATION_RATE_EAST : ADAPTATION_RATE_WEST;
        const adaptation = Math.min(Math.abs(currentPhaseShift), restDays * adaptationRate);
        currentPhaseShift = currentPhaseShift > 0 
          ? currentPhaseShift - adaptation 
          : currentPhaseShift + adaptation;
      }
      
      // Add timezone shift from this duty (eastward = positive, westward = negative)
      const dutyShift = duty.circadianPhaseShift || 0;
      currentPhaseShift += dutyShift;
      
      // Clamp to reasonable range (-12 to +12 hours)
      currentPhaseShift = Math.max(-12, Math.min(12, currentPhaseShift));
      
      // Update circadian state for this day and subsequent days
      for (let day = dayOfMonth; day <= daysInMonth; day++) {
        // Apply adaptation for days after the duty
        let adaptedShift = currentPhaseShift;
        if (day > dayOfMonth) {
          const daysAfter = day - dayOfMonth;
          const adaptationRate = currentPhaseShift > 0 ? ADAPTATION_RATE_EAST : ADAPTATION_RATE_WEST;
          const adaptation = Math.min(Math.abs(currentPhaseShift), daysAfter * adaptationRate);
          adaptedShift = currentPhaseShift > 0 
            ? currentPhaseShift - adaptation 
            : currentPhaseShift + adaptation;
        }
        
        // Shift circadian markers by phase shift
        // Positive shift (east) = markers appear later in local time
        // Negative shift (west) = markers appear earlier in local time
        const wrap = (h: number) => ((h % 24) + 24) % 24;
        
        states.set(day, {
          phaseShift: adaptedShift,
          woclStart: wrap(WOCL_START + adaptedShift),
          woclEnd: wrap(WOCL_END + adaptedShift),
          nadirHour: wrap(NADIR_HOUR + adaptedShift),
          wmzStart: wrap(WMZ_START + adaptedShift),
          wmzEnd: wrap(WMZ_END + adaptedShift),
        });
      }
      
      lastDutyDay = dayOfMonth;
    });
    
    return states;
  }, [duties, daysInMonth]);

  // Build duty segments for display
  const dutySegments = useMemo((): ElapsedSegment[] => {
    const segments: ElapsedSegment[] = [];
    
    duties.forEach((duty) => {
      const dayOfMonth = duty.dateString 
        ? Number(duty.dateString.split('-')[2]) 
        : duty.date.getDate();
      
      if (duty.flightSegments.length === 0) return;
      
      const firstSeg = duty.flightSegments[0];
      const lastSeg = duty.flightSegments[duty.flightSegments.length - 1];
      
      // Parse times
      const reportTime = duty.reportTimeLocal || firstSeg.departureTime;
      const [repH, repM] = reportTime.split(':').map(Number);
      const reportHour = repH + repM / 60;
      
      const [firstDepH, firstDepM] = firstSeg.departureTime.split(':').map(Number);
      const firstDepHour = firstDepH + firstDepM / 60;
      
      const [lastArrH, lastArrM] = lastSeg.arrivalTime.split(':').map(Number);
      const lastArrHour = lastArrH + lastArrM / 60;
      
      // Detect overnight
      const isOvernight = lastArrHour < reportHour;
      
      // Add check-in segment
      if (firstDepHour > reportHour) {
        segments.push({
          dayIndex: dayOfMonth,
          startHour: reportHour,
          endHour: firstDepHour,
          type: 'checkin',
          performance: Math.min(100, duty.avgPerformance + 10),
          duty,
        });
      }
      
      // Add flight segments
      let lastEndHour = firstDepHour;
      duty.flightSegments.forEach((seg, idx) => {
        const [depH, depM] = seg.departureTime.split(':').map(Number);
        const [arrH, arrM] = seg.arrivalTime.split(':').map(Number);
        const depHour = depH + depM / 60;
        let arrHour = arrH + arrM / 60;
        
        // Add ground time between flights
        if (idx > 0 && depHour > lastEndHour + 0.25) {
          segments.push({
            dayIndex: dayOfMonth,
            startHour: lastEndHour,
            endHour: depHour,
            type: 'ground',
            performance: duty.avgPerformance,
            duty,
          });
        }
        
        // Handle overnight flight
        if (arrHour < depHour) {
          // First part: departure to midnight
          segments.push({
            dayIndex: dayOfMonth,
            startHour: depHour,
            endHour: 24,
            type: 'flight',
            flightNumber: seg.flightNumber,
            departure: seg.departure,
            arrival: seg.arrival,
            performance: seg.performance,
            duty,
            isOvernightStart: true,
          });
          
          // Second part: midnight to arrival (next day)
          if (dayOfMonth < daysInMonth) {
            segments.push({
              dayIndex: dayOfMonth + 1,
              startHour: 0,
              endHour: arrHour,
              type: 'flight',
              flightNumber: seg.flightNumber,
              departure: seg.departure,
              arrival: seg.arrival,
              performance: seg.performance,
              duty,
              isOvernightContinuation: true,
            });
          }
          lastEndHour = arrHour;
        } else {
          segments.push({
            dayIndex: dayOfMonth,
            startHour: depHour,
            endHour: arrHour,
            type: 'flight',
            flightNumber: seg.flightNumber,
            departure: seg.departure,
            arrival: seg.arrival,
            performance: seg.performance,
            duty,
          });
          lastEndHour = arrHour;
        }
      });
    });
    
    return segments;
  }, [duties, daysInMonth]);

  // Build sleep segments for display
  const sleepSegments = useMemo((): SleepSegment[] => {
    const segments: SleepSegment[] = [];
    
    duties.forEach((duty) => {
      const sleepEstimate = duty.sleepEstimate;
      if (!sleepEstimate) return;
      
      const recoveryScore = Math.min(100, (sleepEstimate.effectiveSleepHours / 8) * 100);
      
      // Use pre-computed day/hour if available
      if (sleepEstimate.sleepStartDay != null && sleepEstimate.sleepEndDay != null) {
        const startDay = sleepEstimate.sleepStartDay;
        const endDay = sleepEstimate.sleepEndDay;
        const startHour = sleepEstimate.sleepStartHour || 22;
        const endHour = sleepEstimate.sleepEndHour || 6;
        
        if (startDay === endDay) {
          segments.push({
            dayIndex: startDay,
            startHour,
            endHour,
            recoveryScore,
            effectiveSleep: sleepEstimate.effectiveSleepHours,
            sleepStrategy: sleepEstimate.sleepStrategy,
            relatedDuty: duty,
          });
        } else {
          // Overnight sleep
          if (startDay >= 1 && startDay <= daysInMonth) {
            segments.push({
              dayIndex: startDay,
              startHour,
              endHour: 24,
              recoveryScore,
              effectiveSleep: sleepEstimate.effectiveSleepHours,
              sleepStrategy: sleepEstimate.sleepStrategy,
              relatedDuty: duty,
              isOvernightStart: true,
            });
          }
          if (endDay >= 1 && endDay <= daysInMonth) {
            segments.push({
              dayIndex: endDay,
              startHour: 0,
              endHour,
              recoveryScore,
              effectiveSleep: sleepEstimate.effectiveSleepHours,
              sleepStrategy: sleepEstimate.sleepStrategy,
              relatedDuty: duty,
              isOvernightContinuation: true,
            });
          }
        }
      }
    });
    
    return segments;
  }, [duties]);

  // Get all days that have activity
  const allDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
  }, [daysInMonth, monthStart]);

  if (dutySegments.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="py-8 text-center text-muted-foreground">
          No duty data available for human performance visualization
        </CardContent>
      </Card>
    );
  }

  const hours = Array.from({ length: 8 }, (_, i) => i * 3); // 00, 03, 06, 09, 12, 15, 18, 21

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="text-primary">🧠</span>
          Human Performance Timeline - Circadian Phase Tracking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tracks body clock adaptation across timezone crossings throughout the month
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {duties.length} Duties
            </Badge>
            <Badge variant="outline" className="text-xs">
              {format(month, 'MMMM yyyy')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isZoomed ? `Zoom: ${zoom.scaleX.toFixed(1)}x` : 'Pinch/Ctrl+Scroll to zoom'}
            </span>
            {isZoomed && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
                className="text-xs h-7 px-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Info className="mr-1 h-3 w-3" />
              Understanding This Chart
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Circadian Phase Tracking Model</p>
              <p>
                This chart tracks how your body clock adapts (or doesn't) as you cross timezones.
                The WOCL, Nadir, and WMZ markers shift based on accumulated timezone crossings
                and gradual circadian adaptation (~1h/day east, ~1.5h/day west).
              </p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Circadian Markers (shift with adaptation):</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-wocl/30 border border-wocl/50 rounded-sm" />
                    <span>WOCL - Window of Circadian Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-critical/20 border-l-2 border-critical rounded-sm" />
                    <span>Nadir - Core temp minimum</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-warning/10 border border-warning/30 rounded-sm" />
                    <span>WMZ - Peak alertness zone</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Performance Colors:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(120, 70%, 45%)' }} /> 80-100%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(55, 90%, 55%)' }} /> 60-80%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(0, 80%, 50%)' }} /> &lt;40%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Circadian zone legend */}
        <div className="flex flex-wrap gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3 text-wocl" />
            <span className="text-muted-foreground">WOCL (shifts with TZ)</span>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-critical" />
            <span className="text-muted-foreground">Nadir</span>
          </span>
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3 text-warning" />
            <span className="text-muted-foreground">WMZ (peak)</span>
          </span>
        </div>

        {/* Timeline Grid */}
        <div 
          ref={containerRef}
          className="overflow-auto pb-4"
          style={{ maxHeight: isZoomed ? '80vh' : undefined }}
        >
          <div 
            className="min-w-[800px] transition-transform duration-100"
            style={{
              transform: `translate(${zoom.panX}px, ${zoom.panY}px) scale(${zoom.scaleX}, ${zoom.scaleY})`,
              transformOrigin: 'top left',
              width: `${100 / zoom.scaleX}%`,
            }}
          >
            {/* Header */}
            <div className="mb-4 text-center">
              {pilotName && <h2 className="text-lg font-semibold text-foreground">{pilotName}</h2>}
              {pilotBase && <div className="text-sm text-muted-foreground">Base: {pilotBase}</div>}
            </div>

            <div className="flex">
              {/* Y-axis labels (days of month) */}
              <div className="w-20 flex-shrink-0">
                <div className="h-8" /> {/* Header spacer */}
                {allDays.map((day, idx) => {
                  const dayNum = idx + 1;
                  const circadian = circadianStates.get(dayNum);
                  const phaseShift = circadian?.phaseShift || 0;
                  
                  return (
                    <div
                      key={idx}
                      className="flex h-10 items-center justify-end pr-2 text-xs font-medium"
                    >
                      <div className="text-right">
                        <div className="text-foreground">{format(day, 'EEE dd')}</div>
                        {phaseShift !== 0 && (
                          <div className={cn(
                            "text-[9px]",
                            phaseShift > 0 ? "text-warning" : "text-primary"
                          )}>
                            {phaseShift > 0 ? '+' : ''}{phaseShift.toFixed(1)}h
                          </div>
                        )}
                      </div>
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
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Grid with circadian shading */}
                <div className="relative">
                  {/* Rows */}
                  {allDays.map((day, dayIdx) => {
                    const dayNum = dayIdx + 1;
                    const circadian = circadianStates.get(dayNum);
                    
                    // Get circadian marker positions (adjusted for phase shift)
                    const woclStart = circadian?.woclStart ?? WOCL_START;
                    const woclEnd = circadian?.woclEnd ?? WOCL_END;
                    const nadirHour = circadian?.nadirHour ?? NADIR_HOUR;
                    const wmzStart = circadian?.wmzStart ?? WMZ_START;
                    const wmzEnd = circadian?.wmzEnd ?? WMZ_END;
                    
                    // Handle wrapped WOCL (when it crosses midnight due to phase shift)
                    const woclWraps = woclEnd < woclStart;
                    
                    // Duty segments for this day
                    const dayDutySegments = dutySegments.filter(seg => seg.dayIndex === dayNum);
                    
                    // Sleep segments for this day
                    const daySleepSegments = sleepSegments.filter(seg => seg.dayIndex === dayNum);
                    
                    // Check if day has any activity
                    const hasActivity = dayDutySegments.length > 0 || daySleepSegments.length > 0;
                    const dayOpacity = hasActivity ? 1 : 0.4;

                    return (
                      <div
                        key={dayIdx}
                        className="relative h-10 border-b border-border/20"
                        style={{ opacity: dayOpacity }}
                      >
                        {/* WOCL shading (shifts with circadian adaptation) */}
                        {!woclWraps ? (
                          <div
                            className="absolute top-0 bottom-0 bg-wocl/15"
                            style={{
                              left: `${(woclStart / 24) * 100}%`,
                              width: `${((woclEnd - woclStart) / 24) * 100}%`,
                            }}
                          />
                        ) : (
                          <>
                            <div
                              className="absolute top-0 bottom-0 bg-wocl/15"
                              style={{
                                left: `${(woclStart / 24) * 100}%`,
                                right: 0,
                              }}
                            />
                            <div
                              className="absolute top-0 bottom-0 bg-wocl/15"
                              style={{
                                left: 0,
                                width: `${(woclEnd / 24) * 100}%`,
                              }}
                            />
                          </>
                        )}

                        {/* WMZ shading (subtle) */}
                        {wmzStart < wmzEnd && (
                          <div
                            className="absolute top-0 bottom-0 bg-warning/5 border-l border-r border-warning/20"
                            style={{
                              left: `${(wmzStart / 24) * 100}%`,
                              width: `${((wmzEnd - wmzStart) / 24) * 100}%`,
                            }}
                          />
                        )}

                        {/* Nadir marker */}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-critical/40"
                          style={{
                            left: `${(nadirHour / 24) * 100}%`,
                          }}
                        >
                          <div className="absolute -top-0.5 -left-1.5 text-[8px] text-critical">
                            ▼
                          </div>
                        </div>

                        {/* Grid lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: 24 }, (_, hour) => (
                            <div
                              key={hour}
                              className={cn(
                                "flex-1 border-r",
                                hour % 3 === 0 ? "border-border/40" : "border-border/15"
                              )}
                            />
                          ))}
                        </div>

                        {/* Sleep segments (top lane) */}
                        <TooltipProvider delayDuration={100}>
                          {daySleepSegments.map((segment, segIdx) => {
                            const width = segment.endHour - segment.startHour;
                            if (width <= 0) return null;

                            return (
                              <Tooltip key={`sleep-${segIdx}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute h-3 border transition-all cursor-pointer hover:ring-1 hover:ring-foreground",
                                      !segment.isOvernightStart && !segment.isOvernightContinuation && "rounded",
                                      segment.isOvernightStart && "rounded-l",
                                      segment.isOvernightContinuation && "rounded-r"
                                    )}
                                    style={{
                                      top: '2px',
                                      left: `${(segment.startHour / 24) * 100}%`,
                                      width: `${Math.max((width / 24) * 100, 1)}%`,
                                      backgroundColor: getRecoveryColor(segment.recoveryScore),
                                      borderColor: 'hsl(var(--border))',
                                    }}
                                  >
                                    {width > 2 && (
                                      <span className="text-[8px] text-background flex items-center justify-center h-full">
                                        {getStrategyIcon(segment.sleepStrategy)}
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs p-3">
                                  <div className="space-y-1 text-xs">
                                    <div className="font-semibold border-b pb-1 border-border">
                                      {getStrategyIcon(segment.sleepStrategy)} Sleep Period
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                      <span className="text-muted-foreground">Effective:</span>
                                      <span className="font-mono">{segment.effectiveSleep.toFixed(1)}h</span>
                                      <span className="text-muted-foreground">Recovery:</span>
                                      <span style={{ color: getRecoveryColor(segment.recoveryScore) }} className="font-medium">
                                        {Math.round(segment.recoveryScore)}%
                                      </span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                    );
                          })}
                        </TooltipProvider>

                        {/* Duty segments (bottom lane) */}
                        <TooltipProvider delayDuration={100}>
                          {dayDutySegments.map((segment, segIdx) => {
                            const width = segment.endHour - segment.startHour;
                            if (width <= 0) return null;

                            return (
                              <Tooltip key={`duty-${segIdx}`}>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => onDutySelect(segment.duty)}
                                    className={cn(
                                      "absolute h-5 transition-all hover:ring-2 hover:ring-foreground cursor-pointer",
                                      segment.type === 'checkin' && "opacity-70",
                                      segment.type === 'ground' && "opacity-40",
                                      !segment.isOvernightStart && !segment.isOvernightContinuation && "rounded",
                                      segment.isOvernightStart && "rounded-l",
                                      segment.isOvernightContinuation && "rounded-r",
                                      selectedDuty?.date.getTime() === segment.duty.date.getTime() && "ring-2 ring-foreground"
                                    )}
                                    style={{
                                      top: '18px',
                                      left: `${(segment.startHour / 24) * 100}%`,
                                      width: `${Math.max((width / 24) * 100, 1)}%`,
                                      backgroundColor: segment.type === 'ground' 
                                        ? 'hsl(var(--muted))' 
                                        : getPerformanceColor(segment.performance),
                                    }}
                                  >
                                    {segment.type === 'flight' && segment.flightNumber && width > 2 && (
                                      <span className="text-[7px] font-medium text-background truncate px-0.5 flex items-center justify-center h-full">
                                        {Math.round(segment.performance)}%
                                      </span>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs p-3">
                                  <div className="space-y-1 text-xs">
                                    <div className="font-semibold border-b pb-1 border-border">
                                      {segment.type === 'flight' && segment.flightNumber}
                                      {segment.type === 'checkin' && 'Check-in'}
                                      {segment.type === 'ground' && 'Ground Time'}
                                    </div>
                                    {segment.type === 'flight' && (
                                      <div className="text-muted-foreground">
                                        {segment.departure} → {segment.arrival}
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                      <span className="text-muted-foreground">Time:</span>
                                      <span className="font-mono">
                                        {segment.startHour.toFixed(0).padStart(2, '0')}:00 - {segment.endHour.toFixed(0).padStart(2, '0')}:00
                                      </span>
                                      <span className="text-muted-foreground">Performance:</span>
                                      <span style={{ color: getPerformanceColor(segment.performance) }} className="font-medium">
                                        {Math.round(segment.performance)}%
                                      </span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right legend */}
              <div className="ml-4 flex w-20 flex-shrink-0 flex-col">
                <div className="h-8 text-[10px] text-muted-foreground text-center">Phase</div>
                {allDays.map((day, idx) => {
                  const dayNum = idx + 1;
                  const circadian = circadianStates.get(dayNum);
                  const phaseShift = circadian?.phaseShift || 0;
                  const direction = phaseShift > 0 ? 'E' : phaseShift < 0 ? 'W' : '—';
                  
                  return (
                    <div key={idx} className="h-10 flex items-center text-[9px] text-muted-foreground">
                      {phaseShift !== 0 ? (
                        <div className="text-center w-full">
                          <div className={cn(
                            "font-medium",
                            phaseShift > 3 && "text-warning",
                            phaseShift < -3 && "text-primary"
                          )}>
                            {Math.abs(phaseShift).toFixed(1)}h {direction}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center w-full text-success/70">aligned</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}