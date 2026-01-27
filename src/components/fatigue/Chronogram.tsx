import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DutyAnalysis, DutyStatistics } from '@/types/fatigue';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChronogramProps {
  duties: DutyAnalysis[];
  statistics: DutyStatistics;
  month: Date;
  pilotId: string;
  onDutySelect: (duty: DutyAnalysis) => void;
  selectedDuty: DutyAnalysis | null;
}

type DisplayMode = 'heatmap' | 'timeline' | 'combined';

interface DutyBar {
  dayIndex: number;
  startHour: number;
  endHour: number;
  startPerformance: number;
  endPerformance: number;
  duty: DutyAnalysis;
  isOvernightContinuation?: boolean;
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

export function Chronogram({ duties, statistics, month, pilotId, onDutySelect, selectedDuty }: ChronogramProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('heatmap');
  const [infoOpen, setInfoOpen] = useState(false);

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

  // Convert duties to bar positions with performance gradient data
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
        
        const startHour = startH + startM / 60;
        let endHour = endH + endM / 60;
        
        // Performance at start is higher, decays toward landing
        const startPerf = Math.min(100, duty.avgPerformance + 10); // Slightly higher at start
        const endPerf = duty.landingPerformance;
        
        // Handle overnight duties
        if (endHour < startHour) {
          // Calculate midpoint performance at midnight
          const totalDuration = (24 - startHour) + endHour;
          const midnightRatio = (24 - startHour) / totalDuration;
          const midnightPerf = startPerf - (startPerf - endPerf) * midnightRatio;
          
          // First bar: from start to midnight
          bars.push({
            dayIndex: dayOfMonth,
            startHour,
            endHour: 24,
            startPerformance: startPerf,
            endPerformance: midnightPerf,
            duty,
          });
          // Second bar: from midnight to end (next day)
          if (dayOfMonth < daysInMonth) {
            bars.push({
              dayIndex: dayOfMonth + 1,
              startHour: 0,
              endHour,
              startPerformance: midnightPerf,
              endPerformance: endPerf,
              duty,
              isOvernightContinuation: true,
            });
          }
        } else {
          bars.push({
            dayIndex: dayOfMonth,
            startHour,
            endHour,
            startPerformance: startPerf,
            endPerformance: endPerf,
            duty,
          });
        }
      }
    });
    
    return bars;
  }, [duties, daysInMonth]);

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
            {/* Header with stats */}
            <div className="mb-2 text-center text-sm font-medium">
              {format(month, 'MMMM yyyy')} - High-Resolution Duty Timeline
            </div>
            <div className="mb-4 text-center text-xs text-muted-foreground">
              Pilot: {pilotId} | Duties: {statistics.totalDuties} | High Risk: {statistics.highRiskDuties} | Critical: {statistics.criticalRiskDuties}
            </div>
            
            {/* Legend */}
            <div className="mb-4 flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="h-4 w-8 rounded bg-wocl/30" />
                WOCL
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
                        {/* Duty bars for this day with performance gradient */}
                        {dutyBars
                          .filter((bar) => bar.dayIndex === dayNum)
                          .map((bar, barIndex) => {
                            const avgPerf = (bar.startPerformance + bar.endPerformance) / 2;
                            return (
                              <button
                                key={barIndex}
                                onClick={() => onDutySelect(bar.duty)}
                                className={cn(
                                  "absolute top-1 bottom-1 rounded-sm transition-all hover:ring-2 hover:ring-foreground cursor-pointer overflow-hidden",
                                  selectedDuty?.date.getTime() === bar.duty.date.getTime() && "ring-2 ring-foreground"
                                )}
                                style={{
                                  left: `${(bar.startHour / 24) * 100}%`,
                                  width: `${Math.max(((bar.endHour - bar.startHour) / 24) * 100, 2)}%`,
                                  background: displayMode === 'timeline' 
                                    ? 'hsl(var(--primary))' 
                                    : `linear-gradient(to right, ${getPerformanceColor(bar.startPerformance)}, ${getPerformanceColor(bar.endPerformance)})`,
                                }}
                                title={`${format(bar.duty.date, 'MMM d')}: ${bar.duty.flightSegments.map(s => s.flightNumber).join(', ')} | Start: ${Math.round(bar.startPerformance)}% → End: ${Math.round(bar.endPerformance)}%`}
                              />
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
