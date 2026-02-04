import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DutyAnalysis } from '@/types/fatigue';
import { format, parseISO, differenceInMinutes } from 'date-fns';
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

// Performance color based on score
const getPerformanceColor = (performance: number): string => {
  if (performance >= 80) return 'hsl(120, 70%, 45%)';
  if (performance >= 70) return 'hsl(90, 70%, 50%)';
  if (performance >= 60) return 'hsl(55, 90%, 55%)';
  if (performance >= 50) return 'hsl(40, 95%, 50%)';
  if (performance >= 40) return 'hsl(25, 95%, 50%)';
  return 'hsl(0, 80%, 50%)';
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

// Calculate elapsed hours from trip start
const getElapsedHours = (startIso: string, currentIso: string): number => {
  try {
    const start = parseISO(startIso);
    const current = parseISO(currentIso);
    return differenceInMinutes(current, start) / 60;
  } catch {
    return 0;
  }
};

interface ElapsedSegment {
  elapsedStart: number;    // Hours from trip start
  elapsedEnd: number;      // Hours from trip start
  type: 'checkin' | 'flight' | 'ground' | 'rest';
  flightNumber?: string;
  departure?: string;
  arrival?: string;
  performance: number;
  duty: DutyAnalysis;
}

interface TripData {
  tripStartIso: string;
  totalElapsedHours: number;
  segments: ElapsedSegment[];
  duties: DutyAnalysis[];
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

  // Build continuous elapsed-time data from duties
  const tripData = useMemo((): TripData | null => {
    if (duties.length === 0) return null;

    // Sort duties by date
    const sortedDuties = [...duties].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Find the earliest report time as trip start
    const firstDuty = sortedDuties[0];
    const tripStartIso = firstDuty.reportTimeUtc || 
      `${firstDuty.dateString || format(firstDuty.date, 'yyyy-MM-dd')}T${firstDuty.reportTimeLocal || '06:00'}:00Z`;
    
    const segments: ElapsedSegment[] = [];
    let maxElapsed = 0;

    sortedDuties.forEach((duty) => {
      const dutyReportIso = duty.reportTimeUtc || 
        `${duty.dateString || format(duty.date, 'yyyy-MM-dd')}T${duty.reportTimeLocal || '06:00'}:00Z`;
      
      const dutyStartElapsed = getElapsedHours(tripStartIso, dutyReportIso);
      
      // Add check-in segment
      if (duty.flightSegments.length > 0) {
        const firstFlight = duty.flightSegments[0];
        const firstDepTime = firstFlight.departureTime;
        const [depH, depM] = firstDepTime.split(':').map(Number);
        const reportTime = duty.reportTimeLocal || firstDepTime;
        const [repH, repM] = reportTime.split(':').map(Number);
        
        const checkinDuration = ((depH * 60 + depM) - (repH * 60 + repM)) / 60;
        
        if (checkinDuration > 0) {
          segments.push({
            elapsedStart: dutyStartElapsed,
            elapsedEnd: dutyStartElapsed + Math.max(0, checkinDuration),
            type: 'checkin',
            performance: Math.min(100, duty.avgPerformance + 10),
            duty,
          });
        }
      }

      // Add flight segments
      let segmentElapsed = dutyStartElapsed;
      duty.flightSegments.forEach((seg, idx) => {
        const blockHours = seg.blockHours || 1;
        
        // Add ground time between flights
        if (idx > 0) {
          const prevSeg = duty.flightSegments[idx - 1];
          const [prevArrH, prevArrM] = prevSeg.arrivalTime.split(':').map(Number);
          const [depH, depM] = seg.departureTime.split(':').map(Number);
          let groundMinutes = (depH * 60 + depM) - (prevArrH * 60 + prevArrM);
          if (groundMinutes < 0) groundMinutes += 24 * 60; // Overnight
          const groundHours = groundMinutes / 60;
          
          if (groundHours > 0.25) {
            segments.push({
              elapsedStart: segmentElapsed,
              elapsedEnd: segmentElapsed + groundHours,
              type: 'ground',
              performance: duty.avgPerformance,
              duty,
            });
            segmentElapsed += groundHours;
          }
        } else {
          // First segment - advance past check-in
          const reportTime = duty.reportTimeLocal || seg.departureTime;
          const [repH, repM] = reportTime.split(':').map(Number);
          const [depH, depM] = seg.departureTime.split(':').map(Number);
          const checkinHours = ((depH * 60 + depM) - (repH * 60 + repM)) / 60;
          segmentElapsed = dutyStartElapsed + Math.max(0, checkinHours);
        }

        segments.push({
          elapsedStart: segmentElapsed,
          elapsedEnd: segmentElapsed + blockHours,
          type: 'flight',
          flightNumber: seg.flightNumber,
          departure: seg.departure,
          arrival: seg.arrival,
          performance: seg.performance,
          duty,
        });
        
        segmentElapsed += blockHours;
        maxElapsed = Math.max(maxElapsed, segmentElapsed);
      });
    });

    return {
      tripStartIso,
      totalElapsedHours: Math.ceil(maxElapsed / 24) * 24, // Round up to full days
      segments,
      duties: sortedDuties,
    };
  }, [duties]);

  if (!tripData || tripData.segments.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="py-8 text-center text-muted-foreground">
          No duty data available for elapsed time visualization
        </CardContent>
      </Card>
    );
  }

  // Calculate number of 24h rows needed
  const numRows = Math.max(1, Math.ceil(tripData.totalElapsedHours / 24));
  const hours = Array.from({ length: 8 }, (_, i) => i * 3); // 00, 03, 06, 09, 12, 15, 18, 21

  // Get biological hour for WOCL/Nadir/WMZ positioning
  // For now, use home-base reference; could add phase shift tracking later
  const getBiologicalHour = (elapsedHour: number): number => {
    const tripStartHour = getHourFromIso(tripData.tripStartIso);
    return (tripStartHour + elapsedHour) % 24;
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="text-primary">🧠</span>
          Human Performance Timeline - Continuous Elapsed Time
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Physiologically-correct visualization for ultra-long-haul and multi-sector operations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Trip Duration: {tripData.totalElapsedHours}h
            </Badge>
            <Badge variant="outline" className="text-xs">
              {tripData.duties.length} Duties
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
              <p className="font-medium text-foreground">Continuous Elapsed Time Model</p>
              <p>
                Unlike calendar-based views, this chart plots duties on a continuous timeline 
                from trip start. Each row represents 24 hours of elapsed time, ensuring 
                flight durations appear identical regardless of timezone crossings.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Circadian Markers:</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-wocl/30 border border-wocl/50 rounded-sm" />
                    <span>WOCL (02:00-06:00) - Low alertness</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-critical/20 border-l-2 border-critical rounded-sm" />
                    <span>Nadir (~04:30) - Lowest point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-warning/10 border border-warning/30 rounded-sm" />
                    <span>WMZ (20:00-22:00) - Peak alertness</span>
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
            <span className="text-muted-foreground">WOCL (02-06h)</span>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-critical" />
            <span className="text-muted-foreground">Nadir (~04:30)</span>
          </span>
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3 text-warning" />
            <span className="text-muted-foreground">WMZ (20-22h)</span>
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
              <div className="mt-1 text-sm font-medium">
                {format(month, 'MMMM yyyy')} - Elapsed Time from Trip Start
              </div>
            </div>

            <div className="flex">
              {/* Y-axis labels (elapsed day rows) */}
              <div className="w-20 flex-shrink-0">
                <div className="h-8" /> {/* Header spacer */}
                {Array.from({ length: numRows }, (_, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="flex h-10 items-center justify-end pr-2 text-xs font-medium text-muted-foreground"
                  >
                    <div className="text-right">
                      <div className="text-foreground">{rowIdx * 24}h - {(rowIdx + 1) * 24}h</div>
                      <div className="text-[9px]">Day {rowIdx + 1}</div>
                    </div>
                  </div>
                ))}
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
                      +{hour}h
                    </div>
                  ))}
                </div>

                {/* Grid with circadian shading */}
                <div className="relative">
                  {/* Rows */}
                  {Array.from({ length: numRows }, (_, rowIdx) => {
                    const rowStartElapsed = rowIdx * 24;
                    const rowEndElapsed = (rowIdx + 1) * 24;

                    // Calculate biological hours for this row's circadian markers
                    const rowStartBio = getBiologicalHour(rowStartElapsed);
                    
                    // WOCL position relative to biological clock
                    // Need to find where WOCL falls within this 24h row
                    const getMarkerPositionInRow = (bioHour: number): number | null => {
                      // Calculate the elapsed hour when this biological hour occurs in this row
                      let offset = bioHour - rowStartBio;
                      if (offset < 0) offset += 24;
                      if (offset >= 0 && offset < 24) return offset;
                      return null;
                    };

                    // Find WOCL band positions in this row
                    const woclStartPos = getMarkerPositionInRow(WOCL_START);
                    const woclEndPos = getMarkerPositionInRow(WOCL_END);
                    const nadirPos = getMarkerPositionInRow(NADIR_HOUR);
                    const wmzStartPos = getMarkerPositionInRow(WMZ_START);
                    const wmzEndPos = getMarkerPositionInRow(WMZ_END);

                    // Segments in this row
                    const rowSegments = tripData.segments.filter(seg => 
                      seg.elapsedEnd > rowStartElapsed && seg.elapsedStart < rowEndElapsed
                    );

                    return (
                      <div
                        key={rowIdx}
                        className="relative h-10 border-b border-border/20"
                      >
                        {/* WOCL shading */}
                        {woclStartPos !== null && woclEndPos !== null && (
                          <div
                            className="absolute top-0 bottom-0 bg-wocl/15"
                            style={{
                              left: `${(woclStartPos / 24) * 100}%`,
                              width: `${((woclEndPos - woclStartPos) / 24) * 100}%`,
                            }}
                          />
                        )}
                        {/* Handle WOCL wrapping (if it spans the row boundary) */}
                        {woclStartPos !== null && woclEndPos !== null && woclEndPos < woclStartPos && (
                          <>
                            <div
                              className="absolute top-0 bottom-0 bg-wocl/15"
                              style={{
                                left: `${(woclStartPos / 24) * 100}%`,
                                right: 0,
                              }}
                            />
                            <div
                              className="absolute top-0 bottom-0 bg-wocl/15"
                              style={{
                                left: 0,
                                width: `${(woclEndPos / 24) * 100}%`,
                              }}
                            />
                          </>
                        )}

                        {/* WMZ shading (subtle) */}
                        {wmzStartPos !== null && wmzEndPos !== null && wmzStartPos < wmzEndPos && (
                          <div
                            className="absolute top-0 bottom-0 bg-warning/5 border-l border-r border-warning/20"
                            style={{
                              left: `${(wmzStartPos / 24) * 100}%`,
                              width: `${((wmzEndPos - wmzStartPos) / 24) * 100}%`,
                            }}
                          />
                        )}

                        {/* Nadir marker */}
                        {nadirPos !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-critical/40"
                            style={{
                              left: `${(nadirPos / 24) * 100}%`,
                            }}
                          >
                            <div className="absolute -top-0.5 -left-1.5 text-[8px] text-critical">
                              ▼
                            </div>
                          </div>
                        )}

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

                        {/* Duty segments */}
                        <TooltipProvider delayDuration={100}>
                          {rowSegments.map((segment, segIdx) => {
                            // Calculate position within this row
                            const segStartInRow = Math.max(0, segment.elapsedStart - rowStartElapsed);
                            const segEndInRow = Math.min(24, segment.elapsedEnd - rowStartElapsed);
                            const width = segEndInRow - segStartInRow;

                            if (width <= 0) return null;

                            return (
                              <Tooltip key={segIdx}>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => onDutySelect(segment.duty)}
                                    className={cn(
                                      "absolute top-1.5 h-7 transition-all hover:ring-2 hover:ring-foreground cursor-pointer",
                                      segment.type === 'checkin' && "opacity-70 rounded-l",
                                      segment.type === 'ground' && "opacity-50",
                                      segment.type === 'flight' && "rounded-sm",
                                      selectedDuty?.date.getTime() === segment.duty.date.getTime() && "ring-2 ring-foreground"
                                    )}
                                    style={{
                                      left: `${(segStartInRow / 24) * 100}%`,
                                      width: `${Math.max((width / 24) * 100, 1)}%`,
                                      backgroundColor: segment.type === 'ground' 
                                        ? 'hsl(var(--muted))' 
                                        : getPerformanceColor(segment.performance),
                                    }}
                                  >
                                    {segment.type === 'flight' && segment.flightNumber && width > 1.5 && (
                                      <span className="text-[8px] font-medium text-background truncate px-0.5 flex items-center justify-center h-full">
                                        {segment.flightNumber}
                                      </span>
                                    )}
                                    {segment.type === 'checkin' && width > 0.5 && (
                                      <span className="text-[8px] text-background/80 flex items-center justify-center h-full">✓</span>
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
                                      <span className="text-muted-foreground">Elapsed:</span>
                                      <span className="font-mono">{segment.elapsedStart.toFixed(1)}h - {segment.elapsedEnd.toFixed(1)}h</span>
                                      <span className="text-muted-foreground">Duration:</span>
                                      <span className="font-mono">{(segment.elapsedEnd - segment.elapsedStart).toFixed(1)}h</span>
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
                <div className="h-8 text-[10px] text-muted-foreground text-center">Bio Clock</div>
                {Array.from({ length: numRows }, (_, rowIdx) => {
                  const bioStart = getBiologicalHour(rowIdx * 24);
                  const bioEnd = getBiologicalHour((rowIdx + 1) * 24);
                  return (
                    <div key={rowIdx} className="h-10 flex items-center text-[9px] text-muted-foreground">
                      <div className="text-center w-full">
                        <div>{bioStart.toFixed(0).padStart(2, '0')}:00 → {bioEnd.toFixed(0).padStart(2, '0')}:00</div>
                        <div className="text-[8px] text-primary/70">body ref</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis label */}
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Elapsed Time from Trip Start (hours within each 24h row)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}