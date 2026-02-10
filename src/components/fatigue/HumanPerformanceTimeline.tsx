import { useState, useMemo } from 'react';
import { Info, AlertTriangle, RotateCcw, Brain, Moon, Sun, Zap, ZoomIn, Battery } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DutyAnalysis, DutyStatistics, RestDaySleep, FlightPhase, SleepQualityFactors, SleepReference } from '@/types/fatigue';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useChronogramZoom } from '@/hooks/useChronogramZoom';
import { TimelineLegend } from './TimelineLegend';

interface HumanPerformanceTimelineProps {
  duties: DutyAnalysis[];
  month: Date;
  pilotName?: string;
  pilotBase?: string;
  onDutySelect: (duty: DutyAnalysis) => void;
  selectedDuty: DutyAnalysis | null;
  restDaysSleep?: RestDaySleep[];
}

// Circadian markers in biological time
const WOCL_START = 2;
const WOCL_END = 6;
const NADIR_HOUR = 4.5;
const WMZ_START = 20;
const WMZ_END = 22;

// Circadian adaptation rates
const ADAPTATION_RATE_EAST = 1.0;
const ADAPTATION_RATE_WEST = 1.5;

const DEFAULT_CHECK_IN_MINUTES = 60;

// Minimum sleep bar width in percentage for visibility in continuous timeline
// Lower than the old 1% threshold since we're now spanning multiple days
const MIN_SLEEP_BAR_WIDTH_PCT = 0.1;

const parseTimeToHours = (timeStr: string | undefined): number | undefined => {
  if (!timeStr) return undefined;
  const parts = timeStr.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] + parts[1] / 60;
  }
  return undefined;
};

const decimalToHHmm = (h: number): string => {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getPerformanceColor = (performance: number): string => {
  if (performance >= 80) return 'hsl(120, 70%, 45%)';
  if (performance >= 70) return 'hsl(90, 70%, 50%)';
  if (performance >= 60) return 'hsl(55, 90%, 55%)';
  if (performance >= 50) return 'hsl(40, 95%, 50%)';
  if (performance >= 40) return 'hsl(25, 95%, 50%)';
  return 'hsl(0, 80%, 50%)';
};

const getRecoveryScore = (estimate: NonNullable<DutyAnalysis['sleepEstimate']>): number => {
  const baseScore = (estimate.effectiveSleepHours / 8) * 100;
  const efficiencyBonus = estimate.sleepEfficiency * 20;
  const woclPenalty = estimate.woclOverlapHours * 5;
  return Math.min(100, Math.max(0, baseScore + efficiencyBonus - woclPenalty));
};

const getRecoveryClasses = (score: number): { border: string; bg: string; text: string } => {
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
    case 'afternoon_nap': return '☀️';
    case 'early_bedtime': return '🌙';
    case 'extended': return '🛏️';
    case 'restricted': return '⏰';
    case 'recovery': return '🔋';
    case 'post_duty_recovery': return '🛏️';
    case 'normal': return '😴';
    default: return '😴';
  }
};

interface CircadianState {
  phaseShift: number;
  woclStart: number;
  woclEnd: number;
  nadirHour: number;
  wmzStart: number;
  wmzEnd: number;
}

interface FlightSegmentBar {
  type: 'checkin' | 'flight' | 'ground';
  flightNumber?: string;
  departure?: string;
  arrival?: string;
  startHour: number;
  endHour: number;
  performance: number;
  phases?: {
    phase: FlightPhase;
    performance: number;
    widthPercent: number;
  }[];
}

interface DutyBar {
  dayIndex: number;
  startHour: number;
  endHour: number;
  duty: DutyAnalysis;
  isOvernightStart?: boolean;
  isOvernightContinuation?: boolean;
  segments: FlightSegmentBar[];
}

interface SleepBar {
  dayIndex: number;
  startHour: number;
  endHour: number;
  recoveryScore: number;
  effectiveSleep: number;
  sleepEfficiency: number;
  sleepStrategy: string;
  isPreDuty: boolean;
  relatedDuty: DutyAnalysis;
  isOvernightStart?: boolean;
  isOvernightContinuation?: boolean;
  originalStartHour?: number;
  originalEndHour?: number;
  qualityFactors?: SleepQualityFactors;
  explanation?: string;
  confidenceBasis?: string;
  confidence?: number;
  references?: SleepReference[];
  woclOverlapHours?: number;
}

interface FdpLimitMarker {
  dayIndex: number;
  hour: number;
  maxFdp: number;
  duty: DutyAnalysis;
}

export function HumanPerformanceTimeline({
  duties,
  month,
  pilotName,
  pilotBase,
  onDutySelect,
  selectedDuty,
  restDaysSleep,
}: HumanPerformanceTimelineProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  const { zoom, containerRef, resetZoom, isZoomed } = useChronogramZoom({
    minScaleX: 1,
    maxScaleX: 4,
    minScaleY: 1,
    maxScaleY: 3,
  });

  const showFlightPhases = zoom.scaleX >= 2;

  const daysInMonth = getDaysInMonth(month);
  const monthStart = startOfMonth(month);

  const allDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
  }, [daysInMonth, monthStart]);

  const discretionCount = useMemo(() =>
    duties.filter(d => d.usedDiscretion).length
  , [duties]);

  // ── Circadian adaptation states ──
  const circadianStates = useMemo(() => {
    const states: Map<number, CircadianState> = new Map();
    const sortedDuties = [...duties].sort((a, b) => a.date.getTime() - b.date.getTime());
    let currentPhaseShift = 0;
    let lastDutyDay = 0;

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

    sortedDuties.forEach((duty) => {
      const dayOfMonth = duty.dateString
        ? Number(duty.dateString.split('-')[2])
        : duty.date.getDate();

      if (lastDutyDay > 0 && dayOfMonth > lastDutyDay + 1) {
        const restDays = dayOfMonth - lastDutyDay - 1;
        const adaptationRate = currentPhaseShift > 0 ? ADAPTATION_RATE_EAST : ADAPTATION_RATE_WEST;
        const adaptation = Math.min(Math.abs(currentPhaseShift), restDays * adaptationRate);
        currentPhaseShift = currentPhaseShift > 0
          ? currentPhaseShift - adaptation
          : currentPhaseShift + adaptation;
      }

      const dutyShift = duty.circadianPhaseShift || 0;
      currentPhaseShift += dutyShift;
      currentPhaseShift = Math.max(-12, Math.min(12, currentPhaseShift));

      for (let day = dayOfMonth; day <= daysInMonth; day++) {
        let adaptedShift = currentPhaseShift;
        if (day > dayOfMonth) {
          const daysAfter = day - dayOfMonth;
          const adaptationRate = currentPhaseShift > 0 ? ADAPTATION_RATE_EAST : ADAPTATION_RATE_WEST;
          const adaptation = Math.min(Math.abs(currentPhaseShift), daysAfter * adaptationRate);
          adaptedShift = currentPhaseShift > 0
            ? currentPhaseShift - adaptation
            : currentPhaseShift + adaptation;
        }

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

  // ── Calculate flight segment bars (same logic as Chronogram) ──
  const calculateSegments = (duty: DutyAnalysis, isOvernightContinuation: boolean): FlightSegmentBar[] => {
    const segments: FlightSegmentBar[] = [];
    const flightSegs = duty.flightSegments;
    if (flightSegs.length === 0) return [];

    if (isOvernightContinuation) {
      let lastEndHour = 0;
      flightSegs.forEach((seg) => {
        const [depH, depM] = seg.departureTime.split(':').map(Number);
        const [arrH, arrM] = seg.arrivalTime.split(':').map(Number);
        const depHour = depH + depM / 60;
        const arrHour = arrH + arrM / 60;

        if (arrHour < depHour) {
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
          if (depHour > lastEndHour + 0.25) {
            segments.push({ type: 'ground', startHour: lastEndHour, endHour: depHour, performance: duty.avgPerformance });
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

    const [firstDepH, firstDepM] = flightSegs[0].departureTime.split(':').map(Number);
    const firstDepHour = firstDepH + firstDepM / 60;
    const reportHour = parseTimeToHours(duty.reportTimeLocal);
    const checkInHour = Math.max(0, reportHour ?? (firstDepHour - DEFAULT_CHECK_IN_MINUTES / 60));

    segments.push({
      type: 'checkin',
      startHour: checkInHour,
      endHour: firstDepHour,
      performance: Math.min(100, duty.avgPerformance + 10),
    });

    let passedMidnight = false;
    flightSegs.forEach((seg, index) => {
      if (passedMidnight) return;

      const [depH, depM] = seg.departureTime.split(':').map(Number);
      const [arrH, arrM] = seg.arrivalTime.split(':').map(Number);
      const depHour = depH + depM / 60;
      let arrHour = arrH + arrM / 60;

      if (index > 0) {
        const prevSeg = flightSegs[index - 1];
        const [prevArrH, prevArrM] = prevSeg.arrivalTime.split(':').map(Number);
        const prevArrHour = prevArrH + prevArrM / 60;

        if (prevArrHour > depHour) {
          if (prevArrHour < 23.75) {
            segments.push({ type: 'ground', startHour: prevArrHour, endHour: 24, performance: duty.avgPerformance });
          }
          passedMidnight = true;
          return;
        }

        if (depHour > prevArrHour + 0.25) {
          segments.push({ type: 'ground', startHour: prevArrHour, endHour: depHour, performance: duty.avgPerformance });
        }
      }

      if (arrHour < depHour) {
        arrHour = 24;
        passedMidnight = true;
      }

      const phases: FlightSegmentBar['phases'] = [
        { phase: 'takeoff' as FlightPhase, performance: seg.performance + 5, widthPercent: 15 },
        { phase: 'climb' as FlightPhase, performance: seg.performance + 3, widthPercent: 10 },
        { phase: 'cruise' as FlightPhase, performance: seg.performance, widthPercent: 50 },
        { phase: 'descent' as FlightPhase, performance: seg.performance - 2, widthPercent: 10 },
        { phase: 'approach' as FlightPhase, performance: seg.performance - 4, widthPercent: 10 },
        { phase: 'landing' as FlightPhase, performance: duty.landingPerformance || seg.performance - 5, widthPercent: 5 },
      ];

      segments.push({
        type: 'flight',
        flightNumber: seg.flightNumber,
        departure: seg.departure,
        arrival: seg.arrival,
        startHour: depHour,
        endHour: arrHour,
        performance: seg.performance,
        phases,
      });
    });

    return segments;
  };

  // ── Duty bars ──
  const dutyBars = useMemo(() => {
    const bars: DutyBar[] = [];

    duties.forEach((duty) => {
      const dayOfMonth = duty.dateString
        ? Number(duty.dateString.split('-')[2])
        : duty.date.getDate();

      if (duty.flightSegments.length > 0) {
        const firstSegment = duty.flightSegments[0];
        const lastSegment = duty.flightSegments[duty.flightSegments.length - 1];

        const [startH, startM] = firstSegment.departureTime.split(':').map(Number);
        const [endH, endM] = lastSegment.arrivalTime.split(':').map(Number);

        const startHour = startH + startM / 60;
        const reportHour = parseTimeToHours(duty.reportTimeLocal);
        const checkInHour = Math.max(0, reportHour ?? (startHour - DEFAULT_CHECK_IN_MINUTES / 60));
        let endHour = endH + endM / 60;

        // For continuous elapsed time: if duty crosses midnight, adjust endHour to be > 24
        const isOvernight = endHour < startHour || (startHour >= 16 && endHour < 10);
        if (isOvernight) {
          endHour += 24;
        }

        bars.push({
          dayIndex: dayOfMonth,
          startHour: checkInHour,
          endHour: endHour,
          duty,
          segments: calculateSegments(duty, false),
        });
      }
    });

    return bars;
  }, [duties, daysInMonth]);

  // ── FDP limit markers ──
  const fdpLimitMarkers = useMemo(() => {
    const markers: FdpLimitMarker[] = [];
    dutyBars.forEach((bar) => {
      const maxFdp = bar.duty.maxFdpHours;
      if (!maxFdp) return;
      // In continuous elapsed time, just add the maxFdp to startHour
      const fdpEndHour = bar.startHour + maxFdp;
      markers.push({ dayIndex: bar.dayIndex, hour: fdpEndHour, maxFdp, duty: bar.duty });
    });
    return markers;
  }, [dutyBars, daysInMonth]);

  // ── Sleep bars (mirroring Chronogram logic exactly) ──
  const sleepBars = useMemo(() => {
    const bars: SleepBar[] = [];

    const parseTime = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return h + (m || 0) / 60;
    };

    const parseIsoTimestamp = (isoStr: string): { dayOfMonth: number; hour: number } | null => {
      if (!isoStr) return null;
      const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
      if (m) {
        const dayOfMonth = Number(m[3]);
        const hour = Number(m[4]) + Number(m[5]) / 60;
        if (!Number.isFinite(dayOfMonth) || !Number.isFinite(hour)) return null;
        return { dayOfMonth, hour };
      }
      try {
        const date = new Date(isoStr);
        if (Number.isNaN(date.getTime())) return null;
        return { dayOfMonth: date.getDate(), hour: date.getHours() + date.getMinutes() / 60 };
      } catch { return null; }
    };

    duties.forEach((duty) => {
      const dutyDayOfMonth = duty.dateString
        ? Number(duty.dateString.split('-')[2])
        : duty.date.getDate();
      const sleepEstimate = duty.sleepEstimate;
      if (!sleepEstimate) return;

      const recoveryScore = getRecoveryScore(sleepEstimate);
      const sleepBarExtras = {
        qualityFactors: sleepEstimate.qualityFactors,
        explanation: sleepEstimate.explanation,
        confidenceBasis: sleepEstimate.confidenceBasis,
        confidence: sleepEstimate.confidence,
        references: sleepEstimate.references,
        woclOverlapHours: sleepEstimate.woclOverlapHours,
      };

      // PREFER home-base timezone day/hour values for positioning
      const hasHomeTz =
        sleepEstimate.sleepStartDayHomeTz != null &&
        sleepEstimate.sleepStartHourHomeTz != null &&
        sleepEstimate.sleepEndDayHomeTz != null &&
        sleepEstimate.sleepEndHourHomeTz != null;

      const hasPrecomputed = hasHomeTz || (
        sleepEstimate.sleepStartDay != null &&
        sleepEstimate.sleepStartHour != null &&
        sleepEstimate.sleepEndDay != null &&
        sleepEstimate.sleepEndHour != null);

      const addSleepBar = (dayIndex: number, startHour: number, endHour: number, origStart?: number, origEnd?: number) => {
        bars.push({
          dayIndex, startHour, endHour, recoveryScore,
          effectiveSleep: sleepEstimate.effectiveSleepHours,
          sleepEfficiency: sleepEstimate.sleepEfficiency,
          sleepStrategy: sleepEstimate.sleepStrategy,
          isPreDuty: true, relatedDuty: duty,
          originalStartHour: origStart ?? startHour,
          originalEndHour: origEnd ?? endHour,
          ...sleepBarExtras,
        });
      };

      if (hasPrecomputed) {
        const startDay = sleepEstimate.sleepStartDayHomeTz ?? sleepEstimate.sleepStartDay!;
        const endDay = sleepEstimate.sleepEndDayHomeTz ?? sleepEstimate.sleepEndDay!;
        const startHour = sleepEstimate.sleepStartHourHomeTz ?? sleepEstimate.sleepStartHour!;
        let endHour = sleepEstimate.sleepEndHourHomeTz ?? sleepEstimate.sleepEndHour!;
        const validStart = startDay >= 1 && startDay <= daysInMonth && startHour >= 0 && startHour <= 24;
        const validEnd = endDay >= 1 && endDay <= daysInMonth && endHour >= 0 && endHour <= 24;

        if (validStart && validEnd) {
          // For continuous elapsed time: adjust for overnight sleep
          if (startDay !== endDay || (startDay === endDay && endHour <= startHour)) {
            // Sleep crosses midnight - adjust endHour to be > 24
            endHour += 24;
          }
          addSleepBar(startDay, startHour, endHour, sleepEstimate.sleepStartHourHomeTz ?? sleepEstimate.sleepStartHour!, sleepEstimate.sleepEndHourHomeTz ?? sleepEstimate.sleepEndHour!);
          return;
        }
      }

      // Fallback: ISO timestamps
      {
        const sleepStartIso = sleepEstimate.sleepStartIso ? parseIsoTimestamp(sleepEstimate.sleepStartIso) : null;
        const sleepEndIso = sleepEstimate.sleepEndIso ? parseIsoTimestamp(sleepEstimate.sleepEndIso) : null;

        if (sleepStartIso && sleepEndIso) {
          const startDay = sleepStartIso.dayOfMonth;
          const startHour = sleepStartIso.hour;
          let endHour = sleepEndIso.hour;

          // For continuous elapsed time: if sleep crosses days, adjust endHour
          const daySpan = sleepEndIso.dayOfMonth - startDay;
          if (daySpan > 0) {
            endHour += daySpan * 24;
          } else if (daySpan === 0 && endHour < startHour) {
            // Same calendar day but crosses midnight
            endHour += 24;
          }

          addSleepBar(startDay, startHour, endHour, sleepStartIso.hour, sleepEndIso.hour);
        } else {
          // HH:mm fallback
          const sleepStart = sleepEstimate.sleepStartTime ? parseTime(sleepEstimate.sleepStartTime) : null;
          const sleepEnd = sleepEstimate.sleepEndTime ? parseTime(sleepEstimate.sleepEndTime) : null;
          if (sleepStart !== null && sleepEnd !== null) {
            let endHour = sleepEnd;
            if (sleepStart > sleepEnd) {
              endHour += 24;
            }
            const startDay = dutyDayOfMonth > 1 ? dutyDayOfMonth - 1 : dutyDayOfMonth;
            addSleepBar(startDay, sleepStart, endHour);
          }
        }
      }
    });

    // Rest day sleep bars
    if (restDaysSleep) {
      restDaysSleep.forEach((restDay) => {
        const restDayExtras = {
          qualityFactors: restDay.qualityFactors,
          explanation: restDay.explanation,
          confidenceBasis: restDay.confidenceBasis,
          confidence: restDay.confidence,
          references: restDay.references,
        };
        restDay.sleepBlocks.forEach((block) => {
          const baseScore = (block.effectiveHours / 8) * 100;
          const efficiencyBonus = block.qualityFactor * 20;
          const recoveryScore = Math.min(100, Math.max(0, baseScore + efficiencyBonus));
          const parseIso = (isoStr: string): { dayOfMonth: number; hour: number } | null => {
            if (!isoStr) return null;
            const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
            if (m) return { dayOfMonth: Number(m[3]), hour: Number(m[4]) + Number(m[5]) / 60 };
            return null;
          };

          const sleepStartIso = parseIso(block.sleepStartIso);
          const sleepEndIso = parseIso(block.sleepEndIso);
          if (!sleepStartIso || !sleepEndIso) return;

          const pseudoDuty: DutyAnalysis = {
            date: restDay.date, dayOfWeek: format(restDay.date, 'EEE'),
            dutyHours: 0, blockHours: 0, sectors: 0,
            minPerformance: 100, avgPerformance: 100, landingPerformance: 100,
            sleepDebt: 0, woclExposure: 0, priorSleep: restDay.totalSleepHours,
            overallRisk: 'LOW', minPerformanceRisk: 'LOW', landingRisk: 'LOW',
            smsReportable: false, flightSegments: [],
          };

          const makeSleepBar = (dayIndex: number, startHour: number, endHour: number) => {
            bars.push({
              dayIndex, startHour, endHour, recoveryScore,
              effectiveSleep: block.effectiveHours,
              sleepEfficiency: block.qualityFactor,
              sleepStrategy: restDay.strategyType,
              isPreDuty: false, relatedDuty: pseudoDuty,
              originalStartHour: sleepStartIso!.hour,
              originalEndHour: sleepEndIso!.hour,
              ...restDayExtras,
            });
          };

          const startHour = sleepStartIso.hour;
          let endHour = sleepEndIso.hour;
          const startDay = sleepStartIso.dayOfMonth;
          
          // For continuous elapsed time: if sleep crosses days, adjust endHour
          const daySpan = sleepEndIso.dayOfMonth - startDay;
          if (daySpan > 0) {
            endHour += daySpan * 24;
          } else if (daySpan === 0 && endHour < startHour) {
            // Same calendar day but crosses midnight
            endHour += 24;
          }
          
          makeSleepBar(startDay, startHour, endHour);
        });
      });
    }

    // Deduplicate
    const deduped: SleepBar[] = [];
    const barsByDay = new Map<number, SleepBar[]>();
    bars.forEach(b => {
      const existing = barsByDay.get(b.dayIndex) || [];
      existing.push(b);
      barsByDay.set(b.dayIndex, existing);
    });
    barsByDay.forEach((dayBars) => {
      dayBars.sort((a, b) => a.startHour - b.startHour);
      const kept: SleepBar[] = [];
      for (const bar of dayBars) {
        const overlapping = kept.find(k => bar.startHour < k.endHour && bar.endHour > k.startHour);
        if (overlapping) {
          if (!!bar.qualityFactors && !overlapping.qualityFactors) {
            const idx = kept.indexOf(overlapping);
            kept[idx] = bar;
          }
        } else {
          kept.push(bar);
        }
      }
      deduped.push(...kept);
    });
    return deduped;
  }, [duties, restDaysSleep, daysInMonth]);

  // ── Day warnings ──
  const getDayWarnings = (dayOfMonth: number) => {
    const duty = duties.find(d => d.date.getDate() === dayOfMonth);
    if (!duty) return null;
    const warnings: string[] = [];
    if (duty.woclExposure > 0) warnings.push(`WOCL ${duty.woclExposure.toFixed(1)}h`);
    if (duty.priorSleep < 8) warnings.push(`Sleep ${duty.priorSleep.toFixed(1)}h`);
    if (duty.minPerformance < 60) warnings.push(`Perf ${Math.round(duty.minPerformance)}%`);
    if (duty.sleepDebt > 4) warnings.push(`Debt ${duty.sleepDebt.toFixed(1)}h`);
    return { warnings, risk: duty.overallRisk };
  };

  const ROW_HEIGHT = 40;
  
  // For elapsed time view: calculate total elapsed hours and generate labels
  const totalElapsedHours = daysInMonth * 24;
  const elapsedTimeLabels = useMemo(() => {
    // Generate labels at 24h intervals (0h, 24h, 48h, 72h, ...)
    const labels: number[] = [];
    for (let h = 0; h <= totalElapsedHours; h += 24) {
      labels.push(h);
    }
    return labels;
  }, [totalElapsedHours]);

  if (dutyBars.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="py-8 text-center text-muted-foreground">
          No duty data available for human performance visualization
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showFlightPhases && (
            <p className="text-xs text-primary flex items-center gap-1">
              <ZoomIn className="h-3 w-3" />
              Flight phases visible
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isZoomed ? `Zoom: ${zoom.scaleX.toFixed(1)}x` : 'Pinch/Ctrl+Scroll to zoom'}
          </span>
          {isZoomed && (
            <Button variant="outline" size="sm" onClick={resetZoom} className="text-xs h-7 px-2">
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Info Collapsible */}
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
                <p className="font-medium text-foreground">Circadian Markers:</p>
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

      {/* Collapsible Legend */}
      <TimelineLegend showDiscretion={discretionCount > 0} variant="elapsed" />

      {/* Timeline Grid */}
      <div
        ref={containerRef}
        className="overflow-auto pb-4 touch-pan-x touch-pan-y"
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
              {format(month, 'MMMM yyyy')} — Human Performance · Elapsed Time from t=0
            </div>
            <div className="text-[11px] text-muted-foreground">
              Body clock adapts ~1.0h/day east, ~1.5h/day west · WOCL/Nadir/WMZ markers shift with accumulated timezone crossings
            </div>
          </div>

          {/* Stats row */}
          <div className="mb-4 flex items-center justify-center gap-4 text-xs flex-wrap">
            <span>Duties: <strong>{duties.length}</strong></span>
            <span>High Risk: <strong className="text-high">{duties.filter(d => d.overallRisk === 'HIGH').length}</strong></span>
            <span>Critical: <strong className="text-critical">{duties.filter(d => d.overallRisk === 'CRITICAL').length}</strong></span>
            {discretionCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {discretionCount} Discretion Used
              </Badge>
            )}
          </div>

          <div className="flex">
            {/* Y-axis labels */}
            <div className="w-24 flex-shrink-0">
              <div className="h-8" />
              {allDays.map((day, idx) => {
                const dayNum = idx + 1;
                const circadian = circadianStates.get(dayNum);
                const phaseShift = circadian?.phaseShift || 0;
                const hasDuty = dutyBars.some(bar => bar.dayIndex === dayNum);
                const dayWarnings = getDayWarnings(dayNum);
                const riskClass = dayWarnings?.risk === 'CRITICAL' ? 'risk-border-critical'
                  : dayWarnings?.risk === 'HIGH' ? 'risk-border-high'
                  : dayWarnings?.risk === 'MODERATE' ? 'risk-border-moderate'
                  : hasDuty ? 'risk-border-low' : '';

                // Calculate elapsed time ranges for this day
                const elapsedStart = idx * 24;
                const elapsedEnd = (idx + 1) * 24;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-end pr-2 text-[11px]",
                      !hasDuty && "opacity-40",
                      riskClass
                    )}
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    <div className="text-right">
                      {dayWarnings && dayWarnings.warnings.length > 0 && (
                        <div className={cn(
                          "text-[9px] leading-tight truncate max-w-[55px]",
                          dayWarnings.risk === 'CRITICAL' && "text-critical",
                          dayWarnings.risk === 'HIGH' && "text-high",
                          dayWarnings.risk === 'MODERATE' && "text-warning",
                          dayWarnings.risk === 'LOW' && "text-muted-foreground"
                        )}>
                          {dayWarnings.warnings[0]}
                        </div>
                      )}
                      <div className="text-foreground font-medium text-[11px]">{elapsedStart}h-{elapsedEnd}h</div>
                      <div className="text-[9px] text-muted-foreground">{format(day, 'EEE d')}</div>
                      {phaseShift !== 0 && (
                        <div className={cn(
                          "text-[9px] font-semibold",
                          phaseShift > 0 ? "text-warning" : "text-primary"
                        )}>
                          {phaseShift > 0 ? '→E ' : '→W '}{phaseShift > 0 ? '+' : ''}{phaseShift.toFixed(1)}h
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main chart area */}
            <div className="relative flex-1">
              {/* X-axis header - Elapsed Time */}
              <div className="flex h-8 border-b border-border items-center">
                {elapsedTimeLabels.map((elapsedHours) => (
                  <div
                    key={elapsedHours}
                    className="absolute text-center text-[10px] text-muted-foreground font-medium"
                    style={{ 
                      left: `${(elapsedHours / totalElapsedHours) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {elapsedHours}h
                  </div>
                ))}
              </div>

              {/* Grid with circadian shading */}
              <div className="relative">
                {allDays.map((day, dayIdx) => {
                  const dayNum = dayIdx + 1;
                  const circadian = circadianStates.get(dayNum);

                  const woclStart = circadian?.woclStart ?? WOCL_START;
                  const woclEnd = circadian?.woclEnd ?? WOCL_END;
                  const nadirHour = circadian?.nadirHour ?? NADIR_HOUR;
                  const wmzStart = circadian?.wmzStart ?? WMZ_START;
                  const wmzEnd = circadian?.wmzEnd ?? WMZ_END;

                  const woclWraps = woclEnd < woclStart;
                  
                  // Convert to elapsed time for continuous timeline
                  const dayElapsedStart = dayIdx * 24;
                  const woclElapsedStart = dayElapsedStart + woclStart;
                  const woclElapsedEnd = dayElapsedStart + (woclWraps ? woclEnd + 24 : woclEnd);
                  const nadirElapsed = dayElapsedStart + nadirHour;
                  const wmzElapsedStart = dayElapsedStart + wmzStart;
                  const wmzElapsedEnd = dayElapsedStart + wmzEnd;

                  return (
                    <div key={dayIdx} className="relative border-b border-border/20" style={{ height: `${ROW_HEIGHT}px` }}>
                      {/* WOCL hatched pattern */}
                      {!woclWraps ? (
                        <div
                          className="absolute top-0 bottom-0 wocl-hatch"
                          style={{ 
                            left: `${(woclElapsedStart / totalElapsedHours) * 100}%`, 
                            width: `${((woclElapsedEnd - woclElapsedStart) / totalElapsedHours) * 100}%` 
                          }}
                        />
                      ) : (
                        <>
                          {/* WOCL wraps: draw from start to end of day */}
                          <div 
                            className="absolute top-0 bottom-0 wocl-hatch" 
                            style={{ 
                              left: `${(woclElapsedStart / totalElapsedHours) * 100}%`, 
                              width: `${((dayElapsedStart + 24 - woclElapsedStart) / totalElapsedHours) * 100}%` 
                            }} 
                          />
                          {/* WOCL wraps: draw from start of next day to end */}
                          {dayIdx < daysInMonth - 1 && (
                            <div 
                              className="absolute top-0 bottom-0 wocl-hatch" 
                              style={{ 
                                left: `${((dayIdx + 1) * 24 / totalElapsedHours) * 100}%`, 
                                width: `${(woclEnd / totalElapsedHours) * 100}%` 
                              }} 
                            />
                          )}
                        </>
                      )}

                      {/* WMZ shading */}
                      {wmzStart < wmzEnd && (
                        <div
                          className="absolute top-0 bottom-0 bg-warning/5 border-l border-r border-warning/20"
                          style={{ 
                            left: `${(wmzElapsedStart / totalElapsedHours) * 100}%`, 
                            width: `${((wmzElapsedEnd - wmzElapsedStart) / totalElapsedHours) * 100}%` 
                          }}
                        />
                      )}

                      {/* Nadir marker */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-critical/40"
                        style={{ left: `${(nadirElapsed / totalElapsedHours) * 100}%` }}
                      >
                        <div className="absolute -top-0.5 -left-1.5 text-[8px] text-critical">▼</div>
                      </div>

                      {/* Grid lines - continuous every hour */}
                      <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: totalElapsedHours + 1 }, (_, hour) => (
                          <div
                            key={hour}
                            className={cn("absolute top-0 bottom-0 border-r", hour % 24 === 0 ? "border-border/40" : hour % 3 === 0 ? "border-border/25" : "border-border/10")}
                            style={{ left: `${(hour / totalElapsedHours) * 100}%` }}
                          />
                        ))}
                      </div>

                      {/* Sleep bars with full Popover */}
                      {sleepBars
                        .filter((bar) => bar.dayIndex === dayNum)
                        .map((bar, barIndex) => {
                          // Convert to elapsed time
                          const sleepElapsedStart = (bar.dayIndex - 1) * 24 + bar.startHour;
                          const sleepElapsedEnd = (bar.dayIndex - 1) * 24 + bar.endHour;
                          const barWidth = ((sleepElapsedEnd - sleepElapsedStart) / totalElapsedHours) * 100;
                          const classes = getRecoveryClasses(bar.recoveryScore);
                          // No more overnight splits, so all bars get normal border radius
                          const borderRadius = '2px';
                          return (
                            <Popover key={`sleep-${barIndex}`}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="absolute z-[5] flex items-center justify-end px-1 border border-dashed cursor-pointer hover:brightness-110 transition-all border-primary/20 bg-primary/5"
                                  style={{
                                    top: 0, height: '100%',
                                    left: `${(sleepElapsedStart / totalElapsedHours) * 100}%`,
                                    width: `${Math.max(barWidth, MIN_SLEEP_BAR_WIDTH_PCT)}%`,
                                    borderRadius,
                                  }}
                                >
                                  {barWidth > 0.5 && (
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

                                  {bar.explanation && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-md p-2 text-[11px] text-muted-foreground leading-relaxed">
                                      <span className="text-primary font-medium">💡 </span>{bar.explanation}
                                    </div>
                                  )}

                                  {/* Sleep Window */}
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Sleep Window</span>
                                    <span className="font-mono font-medium text-foreground">
                                      {decimalToHHmm(bar.originalStartHour ?? bar.startHour)} → {decimalToHHmm(bar.originalEndHour ?? bar.endHour)}
                                      {(bar.isOvernightStart || bar.isOvernightContinuation) &&
                                        (bar.originalStartHour ?? bar.startHour) > (bar.originalEndHour ?? bar.endHour) && ' (+1d)'}
                                    </span>
                                  </div>

                                  {/* Recovery Score Breakdown */}
                                  <div className="bg-secondary/30 rounded-lg p-2 space-y-1.5">
                                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Recovery Score Breakdown</div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5"><span className="text-muted-foreground">⏱️</span><span>Effective Sleep</span></div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{bar.effectiveSleep.toFixed(1)}h / 8h</span>
                                        <span className={cn("font-mono font-medium min-w-[40px] text-right",
                                          bar.effectiveSleep >= 7 ? "text-success" : bar.effectiveSleep >= 5 ? "text-warning" : "text-critical"
                                        )}>+{Math.round((bar.effectiveSleep / 8) * 100)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5"><span className="text-muted-foreground">✨</span><span>Sleep Quality</span></div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{Math.round(bar.sleepEfficiency * 100)}% efficiency</span>
                                        <span className={cn("font-mono font-medium min-w-[40px] text-right",
                                          bar.sleepEfficiency >= 0.9 ? "text-success" : bar.sleepEfficiency >= 0.7 ? "text-warning" : "text-high"
                                        )}>+{Math.round(bar.sleepEfficiency * 20)}</span>
                                      </div>
                                    </div>
                                    {(bar.woclOverlapHours ?? 0) > 0 && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5"><span className="text-muted-foreground">🌙</span><span>WOCL Overlap</span></div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">{bar.woclOverlapHours!.toFixed(1)}h</span>
                                          <span className="font-mono font-medium text-critical min-w-[40px] text-right">-{Math.round(bar.woclOverlapHours! * 5)}</span>
                                        </div>
                                      </div>
                                    )}
                                    <div className="border-t border-border/50 pt-1.5 flex items-center justify-between font-medium">
                                      <span>Total Score</span>
                                      <span className={cn("font-mono", classes.text)}>= {Math.round(bar.recoveryScore)}%</span>
                                    </div>
                                  </div>

                                  {/* Quality Factors */}
                                  {bar.qualityFactors && (
                                    <div className="bg-secondary/20 rounded-lg p-2 space-y-1.5">
                                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">🔬 Model Calculation Factors</div>
                                      {Object.entries(bar.qualityFactors).map(([key, value]) => {
                                        const labels: Record<string, string> = {
                                          base_efficiency: 'Base Efficiency', wocl_boost: 'WOCL Boost',
                                          late_onset_penalty: 'Late Onset', recovery_boost: 'Recovery Boost',
                                          time_pressure_factor: 'Time Pressure', insufficient_penalty: 'Duration Penalty',
                                          pre_duty_awake_hours: 'Pre-Duty Awake',
                                        };
                                        const label = labels[key] || key;
                                        const numValue = value as number;
                                        const isHours = key === 'pre_duty_awake_hours';
                                        const isBoost = numValue >= 1;
                                        return (
                                          <div key={key} className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">{label}</span>
                                            <span className={cn("font-mono font-medium",
                                              isHours
                                                ? (numValue <= 2 ? "text-success" : numValue <= 4 ? "text-muted-foreground" : numValue <= 8 ? "text-warning" : "text-critical")
                                                : (numValue >= 1.05 ? "text-success" : numValue >= 0.98 ? "text-muted-foreground" : numValue >= 0.90 ? "text-warning" : "text-critical")
                                            )}>
                                              {isHours ? `${numValue.toFixed(1)}h` : `${isBoost ? '+' : ''}${((numValue - 1) * 100).toFixed(0)}%`}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Confidence */}
                                  {bar.confidence != null && (
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground">Model Confidence</span>
                                      <span className={cn("font-mono font-medium px-1.5 py-0.5 rounded",
                                        bar.confidence >= 0.7 ? "bg-success/10 text-success" :
                                          bar.confidence >= 0.5 ? "bg-warning/10 text-warning" : "bg-high/10 text-high"
                                      )}>{Math.round(bar.confidence * 100)}%</span>
                                    </div>
                                  )}
                                  {bar.confidenceBasis && (
                                    <div className="text-[10px] text-muted-foreground/70 italic leading-relaxed">{bar.confidenceBasis}</div>
                                  )}

                                  {/* References */}
                                  {bar.references && bar.references.length > 0 && (
                                    <div className="border-t border-border/30 pt-2 space-y-1">
                                      <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">📚 Sources</div>
                                      <div className="flex flex-wrap gap-1">
                                        {bar.references.map((ref, i) => (
                                          <span key={ref.key || i} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground" title={ref.full}>
                                            {ref.short}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Strategy Badge */}
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-muted-foreground">Strategy</span>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/50">
                                      <span>{getStrategyIcon(bar.sleepStrategy)}</span>
                                      <span className="capitalize font-medium">{bar.sleepStrategy.split('_').join(' ')}</span>
                                    </div>
                                  </div>

                                  {/* Footer */}
                                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                    {bar.isPreDuty
                                      ? `Rest before ${format(bar.relatedDuty.date, 'EEEE, MMM d')} duty`
                                      : `Rest day recovery • ${format(bar.relatedDuty.date, 'EEEE, MMM d')}`}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}

                      {/* Duty bars with individual flight segments */}
                      {dutyBars
                        .filter((bar) => bar.dayIndex === dayNum)
                        .map((bar, barIndex) => {
                          const usedDiscretion = bar.duty.usedDiscretion;
                          const maxFdp = bar.duty.maxFdpHours;
                          const actualFdp = bar.duty.actualFdpHours || bar.duty.dutyHours;
                          // Convert to elapsed time
                          const dutyElapsedStart = (bar.dayIndex - 1) * 24 + bar.startHour;
                          const dutyElapsedEnd = (bar.dayIndex - 1) * 24 + bar.endHour;
                          const dutyWidth = ((dutyElapsedEnd - dutyElapsedStart) / totalElapsedHours) * 100;
                          // No more overnight splits
                          const borderRadius = '2px';

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
                                      top: 0, height: '100%',
                                      left: `${(dutyElapsedStart / totalElapsedHours) * 100}%`,
                                      width: `${Math.max(dutyWidth, 0.2)}%`,
                                      borderRadius,
                                    }}
                                  >
                                    {bar.segments.map((segment, segIndex) => {
                                      const segmentWidth = ((segment.endHour - segment.startHour) / (bar.endHour - bar.startHour)) * 100;

                                      if (showFlightPhases && segment.type === 'flight' && segment.phases) {
                                        return (
                                          <div key={segIndex} className="h-full relative flex" style={{ width: `${segmentWidth}%` }}>
                                            {segIndex > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-background/70 z-10" />}
                                            {segment.phases.map((phase, phaseIndex) => (
                                              <div
                                                key={phaseIndex}
                                                className="h-full flex items-center justify-center relative"
                                                style={{ width: `${phase.widthPercent}%`, backgroundColor: getPerformanceColor(phase.performance) }}
                                                title={`${phase.phase}: ${Math.round(phase.performance)}%`}
                                              >
                                                {phaseIndex > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-background/40" />}
                                                {phase.phase === 'cruise' && zoom.scaleX >= 2.5 && segmentWidth > 15 && (
                                                  <span className="text-[6px] font-medium text-background/90 truncate">{Math.round(phase.performance)}%</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      }

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
                                          {segIndex > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-background/70" />}
                                          {segment.type === 'flight' && segment.flightNumber && segmentWidth > 8 && (
                                            <span className="text-[8px] font-medium text-background truncate px-0.5">{segment.flightNumber}</span>
                                          )}
                                          {segment.type === 'checkin' && segmentWidth > 5 && (
                                            <span className="text-[8px] text-background/80">✓</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {usedDiscretion && (
                                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-critical flex items-center justify-center">
                                        <AlertTriangle className="h-2 w-2 text-critical-foreground" />
                                      </div>
                                    )}
                                  </button>
                                </TooltipTrigger>

                                <TooltipContent side="top" align="start" className="max-w-xs p-3 z-[100]">
                                  <div className="space-y-2 text-xs">
                                    <div className={cn(
                                      "font-semibold text-sm border-b pb-1 flex items-center justify-between",
                                      usedDiscretion ? "border-critical" : "border-border"
                                    )}>
                                      <span>
                                        {format(bar.duty.date, 'EEEE, MMM d')} {bar.isOvernightContinuation && '(continued)'}
                                      </span>
                                      {usedDiscretion && (
                                        <Badge variant="destructive" className="text-[10px] px-1 py-0">DISCRETION</Badge>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                      <span className="text-muted-foreground">Flights:</span>
                                      <span>{bar.duty.flightSegments.map(s => s.flightNumber).join(', ')}</span>
                                    </div>

                                    {/* EASA ORO.FTL */}
                                    {(maxFdp || bar.duty.extendedFdpHours) && (
                                      <div className="border-t border-border pt-2 mt-2">
                                        <span className="text-muted-foreground font-medium">EASA ORO.FTL:</span>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                          {maxFdp && (<><span className="text-muted-foreground">Max FDP:</span><span>{maxFdp.toFixed(1)}h</span></>)}
                                          {bar.duty.extendedFdpHours && (<><span className="text-muted-foreground">Extended FDP:</span><span className="text-warning">{bar.duty.extendedFdpHours.toFixed(1)}h</span></>)}
                                          <span className="text-muted-foreground">Actual FDP:</span>
                                          <span className={cn(
                                            maxFdp && actualFdp > maxFdp && "text-critical font-medium",
                                            maxFdp && actualFdp <= maxFdp && "text-success"
                                          )}>{actualFdp.toFixed(1)}h</span>
                                          {bar.duty.fdpExceedance && bar.duty.fdpExceedance > 0 && (
                                            <><span className="text-muted-foreground">Exceedance:</span><span className="text-critical font-medium">+{bar.duty.fdpExceedance.toFixed(1)}h</span></>
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

                                    {/* Metrics grid */}
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

                                    {/* Circadian phase info (unique to HPT) */}
                                    {(() => {
                                      const circadian = circadianStates.get(dayNum);
                                      const phaseShift = circadian?.phaseShift || 0;
                                      if (phaseShift === 0) return null;
                                      return (
                                        <div className="border-t border-border pt-2 mt-2">
                                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                                            <Brain className="h-3 w-3" /> Circadian Phase
                                          </span>
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                            <span className="text-muted-foreground">Body Clock Shift:</span>
                                            <span className={cn(
                                              phaseShift > 0 ? "text-warning" : "text-primary",
                                              "font-medium"
                                            )}>{phaseShift > 0 ? '+' : ''}{phaseShift.toFixed(1)}h {phaseShift > 0 ? 'East' : 'West'}</span>
                                            <span className="text-muted-foreground">WOCL Window:</span>
                                            <span className="font-mono">{decimalToHHmm(circadian!.woclStart)} – {decimalToHHmm(circadian!.woclEnd)}</span>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Sleep Recovery */}
                                    {bar.duty.sleepEstimate && (
                                      <div className="border-t border-border pt-2 mt-2">
                                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                                          <Battery className="h-3 w-3" /> Sleep Recovery
                                        </span>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                          <span className="text-muted-foreground">Recovery Score:</span>
                                          {(() => {
                                            const score = getRecoveryScore(bar.duty.sleepEstimate!);
                                            const classes = getRecoveryClasses(score);
                                            return <span className={cn("font-medium", classes.text)}>{Math.round(score)}%</span>;
                                          })()}
                                          <span className="text-muted-foreground">Effective Sleep:</span>
                                          <span>{bar.duty.sleepEstimate.effectiveSleepHours.toFixed(1)}h</span>
                                          <span className="text-muted-foreground">Efficiency:</span>
                                          <span>{Math.round(bar.duty.sleepEstimate.sleepEfficiency * 100)}%</span>
                                          <span className="text-muted-foreground">Strategy:</span>
                                          <span className="capitalize">{getStrategyIcon(bar.duty.sleepEstimate.sleepStrategy)} {bar.duty.sleepEstimate.sleepStrategy.split('_').join(' ')}</span>
                                          {bar.duty.sleepEstimate.warnings.length > 0 && (
                                            <span className="text-muted-foreground col-span-2 text-warning text-[10px] mt-1">
                                              ⚠️ {bar.duty.sleepEstimate.warnings[0]}
                                            </span>
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

                      {/* FDP Limit markers */}
                      {fdpLimitMarkers
                        .filter((marker) => marker.dayIndex === dayNum)
                        .map((marker, markerIndex) => {
                          // Convert to elapsed time
                          const fdpElapsed = (marker.dayIndex - 1) * 24 + marker.hour;
                          return (
                            <div
                              key={`fdp-${markerIndex}`}
                              className="absolute top-0 bottom-0 border-r-2 border-dashed border-muted-foreground/50 pointer-events-none z-30"
                              style={{ left: `${(fdpElapsed / totalElapsedHours) * 100}%` }}
                              title={`Max FDP: ${marker.maxFdp}h`}
                            />
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compact right legend */}
            <div className="ml-3 flex w-10 flex-shrink-0 flex-col">
              <div style={{ height: `${ROW_HEIGHT}px` }} />
              <div className="flex gap-1" style={{ height: `${allDays.length * ROW_HEIGHT}px` }}>
                <div className="w-2.5 rounded-sm overflow-hidden">
                  <div className="h-full w-full" style={{
                    background: 'linear-gradient(to bottom, hsl(120, 70%, 45%), hsl(90, 70%, 50%), hsl(55, 90%, 55%), hsl(40, 95%, 50%), hsl(25, 95%, 50%), hsl(0, 80%, 50%))',
                  }} />
                </div>
                <div className="flex flex-col justify-between text-[9px] text-muted-foreground">
                  <span>100</span>
                  <span>60</span>
                  <span>0</span>
                </div>
              </div>
            </div>
          </div>

          {/* X-axis label */}
          <div className="mt-2 text-center text-xs text-muted-foreground">
            Biological Time (Circadian Phase-Adjusted) · Markers shift with timezone crossings
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
    </div>
  );
}
