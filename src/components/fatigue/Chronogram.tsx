import { useState, useMemo } from 'react';
import { Info, AlertTriangle, Battery } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DutyAnalysis, DutyStatistics, RestDaySleep } from '@/types/fatigue';
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
    case 'afternoon_nap': return '☀️'; // Afternoon nap before night duty
    case 'early_bedtime': return '🌙'; // Early bedtime for early report
    case 'extended': return '🛏️';
    case 'restricted': return '⏰';
    case 'recovery': return '🔋';
    case 'normal': return '😴';
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
  restDaysSleep?: RestDaySleep[];
}

type DisplayMode = 'heatmap' | 'timeline' | 'combined';

// Default check-in time before first sector (EASA typically 60 min)
// Used as fallback when report_time_local is not available from the parser
const DEFAULT_CHECK_IN_MINUTES = 60;

// Parse HH:mm time string to decimal hours
const parseTimeToHours = (timeStr: string | undefined): number | undefined => {
  if (!timeStr) return undefined;
  const parts = timeStr.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] + parts[1] / 60;
  }
  return undefined;
};

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
  isOvernightStart?: boolean; // First part of overnight bar (ends at 24:00)
  isOvernightContinuation?: boolean; // Second part of overnight bar (starts at 00:00)
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
  isOvernightStart?: boolean; // First part of overnight bar (ends at 24:00)
  isOvernightContinuation?: boolean; // Second part of overnight bar (starts at 00:00)
  // Original full sleep window times (for display in tooltip)
  originalStartHour?: number;
  originalEndHour?: number;
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

export function Chronogram({ duties, statistics, month, pilotId, pilotName, pilotBase, pilotAircraft, onDutySelect, selectedDuty, restDaysSleep }: ChronogramProps) {
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
    
    // For overnight continuation, we show the portion of the duty after midnight
    if (isOvernightContinuation) {
      // Collect only after-midnight segments and add ground time between them
      let lastEndHour = 0; // Track where the previous segment ended (starts at 00:00)

      flightSegs.forEach((seg) => {
        const [depH, depM] = seg.departureTime.split(':').map(Number);
        const [arrH, arrM] = seg.arrivalTime.split(':').map(Number);
        const depHour = depH + depM / 60;
        const arrHour = arrH + arrM / 60;

        if (arrHour < depHour) {
          // This flight crosses midnight — show the portion from 00:00 to arrival
          // Add ground time gap if the continuation doesn't start right at 00:00
          if (lastEndHour < arrHour && lastEndHour > 0.25) {
            // There was a previous after-midnight segment; fill ground between them
          }
          segments.push({
            type: 'flight',
            flightNumber: seg.flightNumber,
            departure: seg.departure,
            arrival: seg.arrival,
            startHour: 0,
            endHour: arrHour,
            performance: seg.performance,
          });
          lastEndHour = arrHour;
        } else if (depHour < 12 && arrHour < 12) {
          // Both times are in early morning (after midnight) — show full segment
          // Add ground time from the previous after-midnight endpoint
          if (depHour > lastEndHour + 0.25) {
            segments.push({
              type: 'ground',
              startHour: lastEndHour,
              endHour: depHour,
              performance: duty.avgPerformance,
            });
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
          lastEndHour = arrHour;
        }
      });
      return segments;
    }
    
    // Get first departure for check-in calculation
    const [firstDepH, firstDepM] = flightSegs[0].departureTime.split(':').map(Number);
    const firstDepHour = firstDepH + firstDepM / 60;
    // Use reportTimeLocal directly when available, fall back to default offset from first departure
    const reportHour = parseTimeToHours(duty.reportTimeLocal);
    const checkInHour = Math.max(0, reportHour ?? (firstDepHour - DEFAULT_CHECK_IN_MINUTES / 60));
    
    // Add check-in segment
    segments.push({
      type: 'checkin',
      startHour: checkInHour,
      endHour: firstDepHour,
      performance: Math.min(100, duty.avgPerformance + 10), // Higher at start
    });
    
    // Add each flight segment
    // Track midnight crossing so we stop adding segments for the departure-day bar
    let passedMidnight = false;

    flightSegs.forEach((seg, index) => {
      if (passedMidnight) return;

      const [depH, depM] = seg.departureTime.split(':').map(Number);
      const [arrH, arrM] = seg.arrivalTime.split(':').map(Number);
      const depHour = depH + depM / 60;
      let arrHour = arrH + arrM / 60;

      // Add ground time between flights if there's a gap
      if (index > 0) {
        const prevSeg = flightSegs[index - 1];
        const [prevArrH, prevArrM] = prevSeg.arrivalTime.split(':').map(Number);
        const prevArrHour = prevArrH + prevArrM / 60;

        // Midnight crossed between consecutive segments
        // (previous arrived in PM, this departs in AM next day)
        if (prevArrHour > depHour) {
          // Fill remaining ground time up to midnight and stop
          if (prevArrHour < 23.75) {
            segments.push({
              type: 'ground',
              startHour: prevArrHour,
              endHour: 24,
              performance: duty.avgPerformance,
            });
          }
          passedMidnight = true;
          return;
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

      // Handle overnight: if arrival is before departure, cap at midnight
      if (arrHour < depHour) {
        arrHour = 24; // Cap at midnight for this day's bar
        passedMidnight = true;
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
      // Extract day-of-month from dateString (YYYY-MM-DD) to avoid timezone issues
      // Fallback to Date.getDate() if dateString not available
      const dayOfMonth = duty.dateString 
        ? Number(duty.dateString.split('-')[2]) 
        : duty.date.getDate();
      
      // Calculate start and end times from flight segments
      if (duty.flightSegments.length > 0) {
        const firstSegment = duty.flightSegments[0];
        const lastSegment = duty.flightSegments[duty.flightSegments.length - 1];
        
        const [startH, startM] = firstSegment.departureTime.split(':').map(Number);
        const [endH, endM] = lastSegment.arrivalTime.split(':').map(Number);
        
        // FDP starts at check-in (before first departure)
        const startHour = startH + startM / 60;
        // Use reportTimeLocal directly when available, fall back to default offset from first departure
        const reportHour = parseTimeToHours(duty.reportTimeLocal);
        const checkInHour = Math.max(0, reportHour ?? (startHour - DEFAULT_CHECK_IN_MINUTES / 60));
        const endHour = endH + endM / 60;
        
        // Detect overnight duty - FDP crosses midnight:
        // 1. End time is numerically less than start time (e.g., depart 18:00, arrive 04:00)
        // 2. Departure after 16:00 AND arrival before 10:00 (covers night ops)
        // This ensures flights like 18:00→02:00 or 20:00→05:00 are properly split
        const isOvernight = endHour < startHour || (startHour >= 16 && endHour < 10);
        
        if (isOvernight) {
          // First bar: from check-in to midnight (24:00) on departure day
          bars.push({
            dayIndex: dayOfMonth,
            startHour: checkInHour,
            endHour: 24, // Always ends at midnight for display
            duty,
            isOvernightStart: true,
            segments: calculateSegments(duty, false),
          });
          
          // Second bar: from midnight (00:00) to arrival on next day
          // Only add if the duty actually continues past midnight
          if (dayOfMonth < daysInMonth && endHour > 0) {
            bars.push({
              dayIndex: dayOfMonth + 1,
              startHour: 0,
              endHour: endHour,
              duty,
              isOvernightContinuation: true,
              segments: calculateSegments(duty, true),
            });
          }
        } else {
          // Same-day duty - no overnight crossing
          bars.push({
            dayIndex: dayOfMonth,
            startHour: checkInHour,
            endHour: endHour,
            duty,
            segments: calculateSegments(duty, false),
          });
        }
      }
    });
    
    return bars;
  }, [duties, daysInMonth]);

  // Compute FDP limit markers - these need to be rendered separately from duty bars
  // to handle overnight cases where the FDP limit extends past midnight
  interface FdpLimitMarker {
    dayIndex: number;
    hour: number; // Position in that day (0-24)
    maxFdp: number;
    duty: DutyAnalysis;
  }

  const fdpLimitMarkers = useMemo(() => {
    const markers: FdpLimitMarker[] = [];
    
    dutyBars.forEach((bar) => {
      // Only compute from the start of the duty (not continuations)
      if (bar.isOvernightContinuation) return;
      
      const maxFdp = bar.duty.maxFdpHours;
      if (!maxFdp) return;
      
      const fdpEndHour = bar.startHour + maxFdp;
      
      if (fdpEndHour <= 24) {
        // FDP limit is on the same day
        markers.push({
          dayIndex: bar.dayIndex,
          hour: fdpEndHour,
          maxFdp,
          duty: bar.duty,
        });
      } else {
        // FDP limit extends past midnight - render on next day
        const nextDayHour = fdpEndHour - 24;
        if (bar.dayIndex < daysInMonth) {
          markers.push({
            dayIndex: bar.dayIndex + 1,
            hour: nextDayHour,
            maxFdp,
            duty: bar.duty,
          });
        }
      }
    });
    
    return markers;
  }, [dutyBars, daysInMonth]);

  // Calculate sleep/rest period bars showing recovery using backend timing
  // Uses ISO timestamps for accurate date/day positioning when available
  const sleepBars = useMemo(() => {
    const bars: SleepBar[] = [];
    
    // Helper to parse HH:mm to decimal hours
    const parseTime = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return h + (m || 0) / 60;
    };
    
    // Helper to extract day-of-month and hour from ISO timestamp.
    // IMPORTANT: Do NOT use `new Date(iso)` here because it converts to the browser's local timezone,
    // which can shift sleep blocks onto the wrong day/hour and create visual overlap.
    // We intentionally parse the date/time *as written in the ISO string*.
    const parseIsoTimestamp = (isoStr: string): { dayOfMonth: number; hour: number } | null => {
      if (!isoStr) return null;

      // Fast-path for standard ISO strings: YYYY-MM-DDTHH:mm...
      const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
      if (m) {
        const dayOfMonth = Number(m[3]);
        const hour = Number(m[4]) + Number(m[5]) / 60;
        if (!Number.isFinite(dayOfMonth) || !Number.isFinite(hour)) return null;
        return { dayOfMonth, hour };
      }

      // Fallback for unexpected formats
      try {
        const date = new Date(isoStr);
        if (Number.isNaN(date.getTime())) return null;
        return {
          dayOfMonth: date.getDate(),
          hour: date.getHours() + date.getMinutes() / 60,
        };
      } catch {
        return null;
      }
    };
    
    duties.forEach((duty) => {
      // Extract day-of-month from dateString to avoid timezone issues
      const dutyDayOfMonth = duty.dateString 
        ? Number(duty.dateString.split('-')[2]) 
        : duty.date.getDate();
      const sleepEstimate = duty.sleepEstimate;

      if (!sleepEstimate) return;

      const recoveryScore = getRecoveryScore(sleepEstimate);
      
      // PREFER pre-computed day/hour values if available (timezone-safe from backend)
      const hasPrecomputed = 
        sleepEstimate.sleepStartDay != null && 
        sleepEstimate.sleepStartHour != null && 
        sleepEstimate.sleepEndDay != null && 
        sleepEstimate.sleepEndHour != null;
      
      if (hasPrecomputed) {
        // Use backend-computed day/hour values directly (no timezone conversion needed)
        const startDay = sleepEstimate.sleepStartDay!;
        const endDay = sleepEstimate.sleepEndDay!;
        const startHour = sleepEstimate.sleepStartHour!;
        const endHour = sleepEstimate.sleepEndHour!;
        
        if (startDay === endDay) {
          // Same-day sleep (e.g., afternoon nap)
          bars.push({
            dayIndex: startDay,
            startHour,
            endHour,
            recoveryScore,
            effectiveSleep: sleepEstimate.effectiveSleepHours,
            sleepEfficiency: sleepEstimate.sleepEfficiency,
            sleepStrategy: sleepEstimate.sleepStrategy,
            isPreDuty: true,
            relatedDuty: duty,
          });
        } else {
          // Overnight sleep: crosses midnight into different day
          // Part 1: startHour to 24:00 on start day
          if (startDay >= 1 && startDay <= daysInMonth) {
            bars.push({
              dayIndex: startDay,
              startHour,
              endHour: 24,
              recoveryScore,
              effectiveSleep: sleepEstimate.effectiveSleepHours,
              sleepEfficiency: sleepEstimate.sleepEfficiency,
              sleepStrategy: sleepEstimate.sleepStrategy,
              isPreDuty: true,
              relatedDuty: duty,
              isOvernightStart: true,
              originalStartHour: startHour,
              originalEndHour: endHour,
            });
          }
          // Part 2: 00:00 to endHour on end day
          if (endDay >= 1 && endDay <= daysInMonth && endHour > 0) {
            bars.push({
              dayIndex: endDay,
              startHour: 0,
              endHour,
              recoveryScore,
              effectiveSleep: sleepEstimate.effectiveSleepHours,
              sleepEfficiency: sleepEstimate.sleepEfficiency,
              sleepStrategy: sleepEstimate.sleepStrategy,
              isPreDuty: true,
              relatedDuty: duty,
              isOvernightContinuation: true,
              originalStartHour: startHour,
              originalEndHour: endHour,
            });
          }
        }
      } else {
        // FALLBACK: Parse ISO timestamps (legacy behavior)
        const sleepStartIso = sleepEstimate.sleepStartIso ? parseIsoTimestamp(sleepEstimate.sleepStartIso) : null;
        const sleepEndIso = sleepEstimate.sleepEndIso ? parseIsoTimestamp(sleepEstimate.sleepEndIso) : null;
        
        if (sleepStartIso && sleepEndIso) {
          // Use ISO timestamps for precise day placement
          const startDay = sleepStartIso.dayOfMonth;
          const endDay = sleepEndIso.dayOfMonth;
          const startHour = sleepStartIso.hour;
          const endHour = sleepEndIso.hour;
          
          if (startDay === endDay) {
            // Same-day sleep (e.g., afternoon nap)
            bars.push({
              dayIndex: startDay,
              startHour,
              endHour,
              recoveryScore,
              effectiveSleep: sleepEstimate.effectiveSleepHours,
              sleepEfficiency: sleepEstimate.sleepEfficiency,
              sleepStrategy: sleepEstimate.sleepStrategy,
              isPreDuty: true,
              relatedDuty: duty,
            });
          } else {
            // Overnight sleep: crosses midnight into different day
            // Part 1: startHour to 24:00 on start day
            if (startDay >= 1 && startDay <= daysInMonth) {
              bars.push({
                dayIndex: startDay,
                startHour,
                endHour: 24,
                recoveryScore,
                effectiveSleep: sleepEstimate.effectiveSleepHours,
                sleepEfficiency: sleepEstimate.sleepEfficiency,
                sleepStrategy: sleepEstimate.sleepStrategy,
                isPreDuty: true,
                relatedDuty: duty,
                isOvernightStart: true,
                originalStartHour: startHour,
                originalEndHour: endHour,
              });
            }
            // Part 2: 00:00 to endHour on end day
            if (endDay >= 1 && endDay <= daysInMonth && endHour > 0) {
              bars.push({
                dayIndex: endDay,
                startHour: 0,
                endHour,
                recoveryScore,
                effectiveSleep: sleepEstimate.effectiveSleepHours,
                sleepEfficiency: sleepEstimate.sleepEfficiency,
                sleepStrategy: sleepEstimate.sleepStrategy,
                isPreDuty: true,
                relatedDuty: duty,
                isOvernightContinuation: true,
                originalStartHour: startHour,
                originalEndHour: endHour,
              });
            }
          }
        } else {
          // FALLBACK: Use HH:mm times (legacy behavior - may be inaccurate for overnight)
          const sleepStart = sleepEstimate.sleepStartTime ? parseTime(sleepEstimate.sleepStartTime) : null;
          const sleepEnd = sleepEstimate.sleepEndTime ? parseTime(sleepEstimate.sleepEndTime) : null;
          
          if (sleepStart !== null && sleepEnd !== null) {
            if (sleepStart > sleepEnd) {
              // Assume overnight sleep: spans midnight
              if (dutyDayOfMonth > 1) {
                bars.push({
                  dayIndex: dutyDayOfMonth - 1,
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
              bars.push({
                dayIndex: dutyDayOfMonth,
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
              // Same-day sleep
              bars.push({
                dayIndex: dutyDayOfMonth,
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
          } else if (duty.flightSegments.length > 0) {
            // Fallback: estimate sleep window from total hours
            const firstSeg = duty.flightSegments[0];
            const [depH, depM] = firstSeg.departureTime.split(':').map(Number);
            const dutyStart = depH + depM / 60;
            const sleepDuration = sleepEstimate.totalSleepHours;
            
            // Estimate wake time as 1.5h before duty
            const wakeTime = Math.max(0, dutyStart - 1.5);
            let estimatedSleepStart = wakeTime - sleepDuration;
            
            if (estimatedSleepStart < 0) {
              estimatedSleepStart += 24;
              if (dutyDayOfMonth > 1) {
                bars.push({
                  dayIndex: dutyDayOfMonth - 1,
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
                  dayIndex: dutyDayOfMonth,
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
              bars.push({
                dayIndex: dutyDayOfMonth,
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
      }
    });
    
    // Add rest day sleep bars (from separate rest_days_sleep array)
    if (restDaysSleep) {
      restDaysSleep.forEach((restDay) => {
        restDay.sleepBlocks.forEach((block) => {
          // Calculate recovery score for rest day sleep
          const baseScore = (block.effectiveHours / 8) * 100;
          const efficiencyBonus = block.qualityFactor * 20;
          const recoveryScore = Math.min(100, Math.max(0, baseScore + efficiencyBonus));
          
          // Use ISO timestamps for accurate positioning.
          // IMPORTANT: Parse directly from ISO string to avoid browser timezone conversion.
          const parseIso = (isoStr: string): { dayOfMonth: number; hour: number } | null => {
            if (!isoStr) return null;

            // Fast-path for standard ISO strings: YYYY-MM-DDTHH:mm...
            const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
            if (m) {
              const dayOfMonth = Number(m[3]);
              const hour = Number(m[4]) + Number(m[5]) / 60;
              if (!Number.isFinite(dayOfMonth) || !Number.isFinite(hour)) return null;
              return { dayOfMonth, hour };
            }

            // Fallback for unexpected formats
            try {
              const date = new Date(isoStr);
              if (Number.isNaN(date.getTime())) return null;
              return {
                dayOfMonth: date.getDate(),
                hour: date.getHours() + date.getMinutes() / 60,
              };
            } catch {
              return null;
            }
          };
          
          const sleepStartIso = parseIso(block.sleepStartIso);
          const sleepEndIso = parseIso(block.sleepEndIso);
          
          if (sleepStartIso && sleepEndIso) {
            const startDay = sleepStartIso.dayOfMonth;
            const endDay = sleepEndIso.dayOfMonth;
            const startHour = sleepStartIso.hour;
            const endHour = sleepEndIso.hour;
            
            // Create a pseudo-duty for tooltip display purposes
            const pseudoDuty: DutyAnalysis = {
              date: restDay.date,
              dayOfWeek: format(restDay.date, 'EEE'),
              dutyHours: 0,
              blockHours: 0,
              sectors: 0,
              minPerformance: 100,
              avgPerformance: 100,
              landingPerformance: 100,
              sleepDebt: 0,
              woclExposure: 0,
              priorSleep: restDay.totalSleepHours,
              overallRisk: 'LOW',
              minPerformanceRisk: 'LOW',
              landingRisk: 'LOW',
              smsReportable: false,
              flightSegments: [],
            };
            
            if (startDay === endDay) {
              // Same-day sleep
              bars.push({
                dayIndex: startDay,
                startHour,
                endHour,
                recoveryScore,
                effectiveSleep: block.effectiveHours,
                sleepEfficiency: block.qualityFactor,
                sleepStrategy: restDay.strategyType,
                isPreDuty: false,
                relatedDuty: pseudoDuty,
              });
            } else {
              // Overnight sleep: crosses midnight
              // Part 1: startHour to 24:00 on start day
              if (startDay >= 1 && startDay <= daysInMonth) {
                bars.push({
                  dayIndex: startDay,
                  startHour,
                  endHour: 24,
                  recoveryScore,
                  effectiveSleep: block.effectiveHours,
                  sleepEfficiency: block.qualityFactor,
                  sleepStrategy: restDay.strategyType,
                  isPreDuty: false,
                  relatedDuty: pseudoDuty,
                  isOvernightStart: true,
                  originalStartHour: startHour,
                  originalEndHour: endHour,
                });
              }
              // Part 2: 00:00 to endHour on end day
              if (endDay >= 1 && endDay <= daysInMonth && endHour > 0) {
                bars.push({
                  dayIndex: endDay,
                  startHour: 0,
                  endHour,
                  recoveryScore,
                  effectiveSleep: block.effectiveHours,
                  sleepEfficiency: block.qualityFactor,
                  sleepStrategy: restDay.strategyType,
                  isPreDuty: false,
                  relatedDuty: pseudoDuty,
                  isOvernightContinuation: true,
                  originalStartHour: startHour,
                  originalEndHour: endHour,
                });
              }
            }
          }
        });
      });
    }
    
    return bars;
  }, [duties, restDaysSleep, daysInMonth]);

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
              {(pilotBase || pilotAircraft) && (
                <div className="text-sm text-muted-foreground">
                  <span>{[pilotBase, pilotAircraft].filter(Boolean).join(' | ')}</span>
                </div>
              )}
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
                        {/* Sleep/Rest bars for this day showing recovery - SEPARATE LANE at top */}
                        {sleepBars
                          .filter((bar) => bar.dayIndex === dayNum)
                          .map((bar, barIndex) => {
                            const barWidth = ((bar.endHour - bar.startHour) / 24) * 100;
                            const classes = getRecoveryClasses(bar.recoveryScore);
                            // Determine border radius based on overnight status
                            // Start bars: rounded left, flat right; Continuation bars: flat left, rounded right
                            const borderRadius = bar.isOvernightStart 
                              ? '2px 0 0 2px' 
                              : bar.isOvernightContinuation 
                                ? '0 2px 2px 0' 
                                : '2px';
                            return (
                              <Popover key={`sleep-${barIndex}`}>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className={cn(
                                      "absolute z-20 flex items-center justify-end px-1 border border-dashed cursor-pointer hover:brightness-110 transition-all",
                                      classes.border,
                                      classes.bg
                                    )}
                                    style={{
                                      top: 1,
                                      height: 11,
                                      left: `${(bar.startHour / 24) * 100}%`,
                                      width: `${Math.max(barWidth, 1)}%`,
                                      borderRadius,
                                      // Remove border on connected edges for visual continuity
                                      borderRight: bar.isOvernightStart ? 'none' : undefined,
                                      borderLeft: bar.isOvernightContinuation ? 'none' : undefined,
                                    }}
                                  >
                                    {/* Show recovery info if bar is wide enough */}
                                    {barWidth > 6 && (
                                      <div className={cn("flex items-center gap-0.5 text-[8px] font-medium", classes.text)}>
                                        <span>{getStrategyIcon(bar.sleepStrategy)}</span>
                                        <span>{Math.round(bar.recoveryScore)}%</span>
                                      </div>
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent align="start" side="top" className="max-w-sm p-3">
                                  <div className="space-y-2 text-xs">
                                      {/* Header */}
                                      <div className="flex items-center justify-between border-b border-border pb-2">
                                        <div className="font-semibold flex items-center gap-1.5">
                                          <span className="text-base">{bar.isPreDuty ? '🛏️' : '🔋'}</span>
                                          <span>{bar.isPreDuty ? 'Pre-Duty Sleep' : 'Recovery Sleep'}</span>
                                        </div>
                                        <div className={cn("text-lg font-bold", classes.text)}>
                                          {Math.round(bar.recoveryScore)}%
                                        </div>
                                      </div>
                                      
                                      {/* Sleep Timing - show full window for overnight sleep */}
                                      <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Sleep Window</span>
                                        <span className="font-mono font-medium text-foreground">
                                          {(bar.originalStartHour ?? bar.startHour).toFixed(0).padStart(2, '0')}:00 → {(bar.originalEndHour ?? bar.endHour).toFixed(0).padStart(2, '0')}:00
                                          {(bar.isOvernightStart || bar.isOvernightContinuation) && ' (+1d)'}
                                        </span>
                                      </div>
                                      
                                      {/* Recovery Score Breakdown */}
                                      <div className="bg-secondary/30 rounded-lg p-2 space-y-1.5">
                                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                          Recovery Score Breakdown
                                        </div>
                                        
                                        {/* Base Score from Sleep */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-muted-foreground">⏱️</span>
                                            <span>Effective Sleep</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">{bar.effectiveSleep.toFixed(1)}h / 8h</span>
                                            <span className={cn(
                                              "font-mono font-medium min-w-[40px] text-right",
                                              bar.effectiveSleep >= 7 ? "text-success" : 
                                              bar.effectiveSleep >= 5 ? "text-warning" : "text-critical"
                                            )}>
                                              +{Math.round((bar.effectiveSleep / 8) * 100)}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Efficiency Bonus */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-muted-foreground">✨</span>
                                            <span>Sleep Quality</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">{Math.round(bar.sleepEfficiency * 100)}% efficiency</span>
                                            <span className={cn(
                                              "font-mono font-medium min-w-[40px] text-right",
                                              bar.sleepEfficiency >= 0.9 ? "text-success" : 
                                              bar.sleepEfficiency >= 0.7 ? "text-warning" : "text-high"
                                            )}>
                                              +{Math.round(bar.sleepEfficiency * 20)}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* WOCL Penalty (only for pre-duty sleep with WOCL data) */}
                                        {bar.isPreDuty && bar.relatedDuty.sleepEstimate?.woclOverlapHours > 0 && (
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-muted-foreground">🌙</span>
                                              <span>WOCL Overlap</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-muted-foreground">{bar.relatedDuty.sleepEstimate.woclOverlapHours.toFixed(1)}h</span>
                                              <span className="font-mono font-medium text-critical min-w-[40px] text-right">
                                                -{Math.round(bar.relatedDuty.sleepEstimate.woclOverlapHours * 5)}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Divider & Total */}
                                        <div className="border-t border-border/50 pt-1.5 flex items-center justify-between font-medium">
                                          <span>Total Score</span>
                                          <span className={cn("font-mono", classes.text)}>
                                            = {Math.round(bar.recoveryScore)}%
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Strategy Badge */}
                                      <div className="flex items-center justify-between pt-1">
                                        <span className="text-muted-foreground">Strategy</span>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/50">
                                          <span>{getStrategyIcon(bar.sleepStrategy)}</span>
                                          <span className="capitalize font-medium">{bar.sleepStrategy.replace('_', ' ')}</span>
                                        </div>
                                      </div>
                                      
                                      {/* Footer Context */}
                                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                        {bar.isPreDuty 
                                          ? `Rest before ${format(bar.relatedDuty.date, 'EEEE, MMM d')} duty`
                                          : `Rest day recovery • ${format(bar.relatedDuty.date, 'EEEE, MMM d')}`
                                        }
                                      </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })}

                        {/* Duty bars for this day with flight phase segments - SEPARATE LANE at bottom */}
                        {dutyBars
                          .filter((bar) => bar.dayIndex === dayNum)
                          .map((bar, barIndex) => {
                            const usedDiscretion = bar.duty.usedDiscretion;
                            const maxFdp = bar.duty.maxFdpHours;
                            const actualFdp = bar.duty.actualFdpHours || bar.duty.dutyHours;
                            // Determine border radius based on overnight status for visual continuity
                            const borderRadius = bar.isOvernightStart 
                              ? '2px 0 0 2px' 
                              : bar.isOvernightContinuation 
                                ? '0 2px 2px 0' 
                                : '2px';
                            
                            return (
                              <TooltipProvider key={barIndex} delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => onDutySelect(bar.duty)}
                                      className={cn(
                                        "absolute z-10 transition-all hover:ring-2 cursor-pointer overflow-hidden flex",
                                        selectedDuty?.date.getTime() === bar.duty.date.getTime() && "ring-2 ring-foreground",
                                        usedDiscretion ? "ring-2 ring-critical hover:ring-critical/80" : "hover:ring-foreground"
                                      )}
                                      style={{
                                        top: 13,
                                        height: 13,
                                        left: `${(bar.startHour / 24) * 100}%`,
                                        width: `${Math.max(((bar.endHour - bar.startHour) / 24) * 100, 2)}%`,
                                        background: displayMode === 'timeline' ? 'hsl(var(--primary))' : undefined,
                                        borderRadius,
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
                                      {/* Discretion warning indicator */}
                                      {usedDiscretion && (
                                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-critical flex items-center justify-center">
                                          <AlertTriangle className="h-2 w-2 text-critical-foreground" />
                                        </div>
                                      )}
                                    </button>
                                  </TooltipTrigger>

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

                        {/* FDP Limit markers for this day - rendered separately to handle overnight cases */}
                        {fdpLimitMarkers
                          .filter((marker) => marker.dayIndex === dayNum)
                          .map((marker, markerIndex) => (
                            <div
                              key={`fdp-${markerIndex}`}
                              className="absolute top-0 bottom-0 border-r-2 border-dashed border-muted-foreground/50 pointer-events-none z-30"
                              style={{
                                left: `${(marker.hour / 24) * 100}%`,
                              }}
                              title={`Max FDP: ${marker.maxFdp}h`}
                            />
                          ))}
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
