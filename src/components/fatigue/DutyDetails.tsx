import { AlertTriangle, Plane, Clock, Moon, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DutyAnalysis } from '@/types/fatigue';
import { format } from 'date-fns';
import { useState } from 'react';
import { PriorSleepIndicator } from './PriorSleepIndicator';
import { SleepRecoveryIndicator } from './SleepRecoveryIndicator';
import { FlightPhasePerformance } from './FlightPhasePerformance';
import { PerformanceDegradation } from './PerformanceDegradation';

interface DutyDetailsProps {
  duty: DutyAnalysis;
}

export function DutyDetails({ duty }: DutyDetailsProps) {
  const [assessmentOpen, setAssessmentOpen] = useState(false);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return <Badge variant="success">LOW</Badge>;
      case 'MODERATE':
        return <Badge variant="warning">MODERATE</Badge>;
      case 'HIGH':
        return <Badge variant="high">HIGH</Badge>;
      case 'CRITICAL':
        return <Badge variant="critical">CRITICAL</Badge>;
      default:
        return <Badge variant="outline">{risk}</Badge>;
    }
  };

  const getRiskEmoji = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return '🟢';
      case 'MODERATE':
        return '🟡';
      case 'HIGH':
        return '🟠';
      case 'CRITICAL':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Section 1: General Details */}
      <Card variant="glow">
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-base md:text-lg">
            {format(duty.date, 'EEE, MMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:gap-4 sm:grid-cols-3">
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-[10px] md:text-xs text-muted-foreground">Duty Hours</p>
              <p className="font-medium text-sm md:text-base">{duty.dutyHours.toFixed(1)}h</p>
            </div>
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-[10px] md:text-xs text-muted-foreground">Sectors</p>
              <p className="font-medium text-sm md:text-base">{duty.sectors}</p>
            </div>
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-[10px] md:text-xs text-muted-foreground">Block Hours</p>
              <p className="font-medium text-sm md:text-base">{Math.max(0, duty.blockHours).toFixed(1)}h</p>
            </div>
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-[10px] md:text-xs text-muted-foreground">Min Performance</p>
              <p className={`font-medium text-sm md:text-base ${duty.minPerformance < 50 ? 'text-critical' : duty.minPerformance < 60 ? 'text-warning' : 'text-foreground'}`}>
                {duty.minPerformance.toFixed(1)}/100
              </p>
            </div>
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-[10px] md:text-xs text-muted-foreground">Avg Performance</p>
              <p className="font-medium text-sm md:text-base">{duty.avgPerformance.toFixed(1)}/100</p>
            </div>
            <div className="space-y-0.5 md:space-y-1">
              <p className="text-[10px] md:text-xs text-muted-foreground">Landing</p>
              <p className={`font-medium text-sm md:text-base ${duty.landingPerformance < 50 ? 'text-critical' : duty.landingPerformance < 60 ? 'text-warning' : 'text-foreground'}`}>
                {duty.landingPerformance.toFixed(1)}/100
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Flight Segments */}
      <Card variant="glass">
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Plane className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
            Flight Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {duty.flightSegments.map((segment, index) => {
              const formatUtcOffset = (offset: number | null | undefined): string => {
                if (offset === null || offset === undefined) return '';
                const sign = offset >= 0 ? '+' : '';
                const hours = Math.floor(Math.abs(offset));
                const minutes = Math.round((Math.abs(offset) - hours) * 60);
                if (minutes === 0) return `UTC${sign}${offset}`;
                return `UTC${sign}${offset >= 0 ? '' : '-'}${hours}:${minutes.toString().padStart(2, '0')}`;
              };

              const depTimeAirport = segment.departureTimeAirportLocal || segment.departureTime;
              const arrTimeAirport = segment.arrivalTimeAirportLocal || segment.arrivalTime;
              const depTzBadge = formatUtcOffset(segment.departureUtcOffset);
              const arrTzBadge = formatUtcOffset(segment.arrivalUtcOffset);

              return (
                <div
                  key={index}
                  className="rounded-xl border border-border/40 bg-secondary/30 p-3 md:p-4 space-y-2.5"
                >
                  {/* Row 1: Flight number + Route + Performance */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs md:text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {segment.flightNumber}
                      </span>
                      <span className="text-sm md:text-base font-medium">
                        {segment.departure} → {segment.arrival}
                      </span>
                    </div>
                    <Badge variant={segment.performance < 50 ? 'critical' : segment.performance < 60 ? 'warning' : 'success'} className="text-[10px] md:text-xs">
                      {segment.performance.toFixed(0)}%
                    </Badge>
                  </div>

                  {/* Row 2: Times */}
                  <div className="space-y-1 pl-1">
                    {/* Primary: Airport-local times */}
                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-foreground">
                      <span>{depTimeAirport}</span>
                      <span className="text-muted-foreground">{segment.departure}</span>
                      {depTzBadge && <span className="text-[8px] md:text-[9px] text-muted-foreground/70">({depTzBadge})</span>}
                      <span className="text-muted-foreground mx-1">—</span>
                      <span>{arrTimeAirport}</span>
                      <span className="text-muted-foreground">{segment.arrival}</span>
                      {arrTzBadge && <span className="text-[8px] md:text-[9px] text-muted-foreground/70">({arrTzBadge})</span>}
                    </div>
                    {/* Secondary: UTC times */}
                    {segment.departureTimeUtc && segment.arrivalTimeUtc && (
                      <p className="text-[10px] md:text-[11px] text-muted-foreground font-mono">
                        {segment.departureTimeUtc} — {segment.arrivalTimeUtc}
                      </p>
                    )}
                    {/* Tertiary: Home base times */}
                    {segment.departureTimeAirportLocal && segment.departureTime !== segment.departureTimeAirportLocal && (
                      <p className="text-[9px] md:text-[10px] text-muted-foreground/70">
                        Home: {segment.departureTime} — {segment.arrivalTime}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Flight Phase Performance */}
      <FlightPhasePerformance duty={duty} />

      {/* Section 4: Performance Degradation (if timeline points available) */}
      {duty.timelinePoints && duty.timelinePoints.length > 0 && (
        <PerformanceDegradation 
          timelinePoint={duty.timelinePoints[duty.timelinePoints.length - 1]} 
          variant="detailed" 
        />
      )}

      {/* Section 5: Prior Sleep */}
      <PriorSleepIndicator duty={duty} variant="detailed" />

      {/* Section 4: Sleep Recovery (Strategic Sleep Estimator) */}
      {duty.sleepEstimate && (
        <SleepRecoveryIndicator duty={duty} variant="detailed" />
      )}

      {/* Section 5: Risk Assessment */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Overall Risk</p>
              <div className="flex items-center gap-2">
                <span>{getRiskEmoji(duty.overallRisk)}</span>
                {getRiskBadge(duty.overallRisk)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Perf. Risk</p>
              {getRiskBadge(duty.minPerformanceRisk)}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Landing Risk</p>
              {getRiskBadge(duty.landingRisk)}
            </div>
          </div>

          {/* Fatigue factors summary */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-xs">
                <span className="text-muted-foreground">Sleep Debt: </span>
                <span className={`font-medium ${duty.sleepDebt > 5 ? 'text-critical' : duty.sleepDebt > 3 ? 'text-warning' : 'text-foreground'}`}>
                  {duty.sleepDebt.toFixed(1)}h
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-xs">
                <span className="text-muted-foreground">WOCL: </span>
                <span className={`font-medium ${duty.woclExposure > 2 ? 'text-critical' : duty.woclExposure > 1 ? 'text-warning' : 'text-foreground'}`}>
                  {duty.woclExposure.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>

          {/* SMS Reportable Warning */}
          {duty.smsReportable && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
              <div>
                <p className="font-medium text-warning text-sm">SMS Reportable</p>
                <p className="text-xs text-muted-foreground">
                  File fatigue report per EASA ORO.FTL.120
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Detailed Assessment (Collapsible) */}
      <Collapsible open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-secondary/30 p-3 text-sm hover:bg-secondary/50">
          <span className="flex items-center gap-2">
            📋 Detailed Assessment & Recommendations
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${assessmentOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="space-y-3 rounded-lg bg-secondary/20 p-4 text-sm">
            <div>
              <h5 className="mb-1 font-medium">Fatigue Factors</h5>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {duty.woclExposure > 0 && (
                  <li>Window of Circadian Low (WOCL) exposure: {duty.woclExposure.toFixed(1)}h</li>
                )}
                {duty.sleepDebt > 3 && (
                  <li>Elevated sleep debt: {duty.sleepDebt.toFixed(1)}h accumulated</li>
                )}
                {duty.priorSleep < 24 && (
                  <li>Limited prior sleep opportunity: {duty.priorSleep.toFixed(1)}h</li>
                )}
              </ul>
            </div>
            <div>
              <h5 className="mb-1 font-medium">Recommendations</h5>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {duty.overallRisk === 'CRITICAL' && (
                  <>
                    <li>Consider controlled rest if operationally feasible</li>
                    <li>Enhanced crew monitoring during critical phases</li>
                    <li>File SMS fatigue report</li>
                  </>
                )}
                {duty.overallRisk === 'HIGH' && (
                  <>
                    <li>Maximize rest opportunities</li>
                    <li>Consider caffeine strategically</li>
                  </>
                )}
                {duty.overallRisk === 'MODERATE' && (
                  <li>Maintain awareness of fatigue symptoms</li>
                )}
                {duty.overallRisk === 'LOW' && (
                  <li>Normal operations - no special mitigations required</li>
                )}
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
