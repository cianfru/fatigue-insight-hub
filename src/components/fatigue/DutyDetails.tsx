import { AlertTriangle, Plane, Clock, Moon, ChevronDown, Globe, Zap, Users } from 'lucide-react';
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
    <div className="space-y-6 animate-fade-in">
      {/* Section 1: General Details */}
      <Card variant="glow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {format(duty.date, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Duty Hours</p>
              <p className="font-medium">{duty.dutyHours.toFixed(1)}h</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sectors</p>
              <p className="font-medium">{duty.sectors}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Block Hours</p>
              <p className="font-medium">{duty.blockHours.toFixed(1)}h</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Performance</p>
              <p className={`font-medium ${duty.minPerformance < 50 ? 'text-critical' : duty.minPerformance < 60 ? 'text-warning' : 'text-foreground'}`}>
                {duty.minPerformance.toFixed(1)}/100
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Performance</p>
              <p className="font-medium">{duty.avgPerformance.toFixed(1)}/100</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Landing Performance</p>
              <p className={`font-medium ${duty.landingPerformance < 50 ? 'text-critical' : duty.landingPerformance < 60 ? 'text-warning' : 'text-foreground'}`}>
                {duty.landingPerformance.toFixed(1)}/100
              </p>
            </div>
            {/* Crew Composition - only for augmented crews */}
            {duty.crewComposition !== 'standard' && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Crew Composition</p>
                  <Badge variant="outline">
                    {duty.crewComposition === 'augmented_3' ? '3-Pilot Augmented' : '4-Pilot Augmented'}
                  </Badge>
                </div>
                {duty.restFacilityClass && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Rest Facility</p>
                    <p className="font-medium capitalize">{duty.restFacilityClass.replace('_', ' ')}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Acclimatization</p>
                  <Badge variant={duty.acclimatizationState === 'acclimatized' ? 'success' : 'warning'}>
                    {duty.acclimatizationState}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Flight Segments */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4 text-primary" />
            Flight Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {duty.flightSegments.map((segment, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-medium text-primary">{segment.flightNumber}</span>
                  <span className="text-sm">
                    {segment.departure} → {segment.arrival}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-foreground">{segment.departureTime} - {segment.arrivalTime}</span>
                    {segment.departureTimeUtc && segment.arrivalTimeUtc && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {segment.departureTimeUtc} - {segment.arrivalTimeUtc}
                      </span>
                    )}
                  </div>
                  <Badge variant={segment.performance < 50 ? 'critical' : segment.performance < 60 ? 'warning' : 'success'}>
                    {segment.performance.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ULR Compliance - only for ULR duties */}
      {duty.isUlr && duty.ulrCompliance && (
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              ULR Compliance
              {duty.ulrCompliance.violations.length > 0 ? (
                <Badge variant="critical">NON-COMPLIANT</Badge>
              ) : (
                <Badge variant="success">COMPLIANT</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max Planned FDP</p>
                <p className="font-medium">{duty.ulrCompliance.maxPlannedFdp.toFixed(1)}h</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">FDP Within Limit</p>
                <Badge variant={duty.ulrCompliance.fdpWithinLimit ? 'success' : 'critical'}>
                  {duty.ulrCompliance.fdpWithinLimit ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Monthly ULR Count</p>
                <p className="font-medium">{duty.ulrCompliance.monthlyUlrCount} / {duty.ulrCompliance.monthlyLimit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pre-ULR Rest</p>
                <Badge variant={duty.ulrCompliance.preUlrRestCompliant ? 'success' : 'critical'}>
                  {duty.ulrCompliance.preUlrRestCompliant ? 'Compliant' : 'Non-Compliant'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Post-ULR Rest</p>
                <Badge variant={duty.ulrCompliance.postUlrRestCompliant ? 'success' : 'critical'}>
                  {duty.ulrCompliance.postUlrRestCompliant ? 'Compliant' : 'Non-Compliant'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Rest Periods Valid</p>
                <Badge variant={duty.ulrCompliance.restPeriodsValid ? 'success' : 'critical'}>
                  {duty.ulrCompliance.restPeriodsValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
            </div>

            {/* Violations */}
            {duty.ulrCompliance.violations.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-critical/50 bg-critical/10 p-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-critical" />
                <div>
                  <p className="font-medium text-critical text-sm">Violations</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {duty.ulrCompliance.violations.map((v, i) => (
                      <li key={i}>- {v}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Warnings */}
            {duty.ulrCompliance.warnings.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-warning text-sm">Warnings</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {duty.ulrCompliance.warnings.map((w, i) => (
                      <li key={i}>- {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* In-Flight Rest Blocks - only for augmented crew duties */}
      {duty.inflightRestBlocks && duty.inflightRestBlocks.length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4 text-chart-2" />
              In-Flight Rest Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {duty.inflightRestBlocks.map((block, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {block.startUtc.slice(11, 16)}Z - {block.endUtc.slice(11, 16)}Z
                    </span>
                    {block.isDuringWocl && (
                      <Badge variant="warning" className="text-[10px]">WOCL</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{block.durationHours.toFixed(1)}h</span>
                    <span className="font-medium">{block.effectiveSleepHours.toFixed(1)}h eff.</span>
                    {block.crewSet && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {block.crewSet.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            {duty.returnToDeckPerformance != null && (
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="text-xs">
                  <span className="text-muted-foreground">Return to Deck: </span>
                  <span className={`font-medium ${duty.returnToDeckPerformance < 60 ? 'text-critical' : duty.returnToDeckPerformance < 70 ? 'text-warning' : 'text-foreground'}`}>
                    {duty.returnToDeckPerformance.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            {duty.preDutyAwakeHours > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="text-xs">
                  <span className="text-muted-foreground">Awake Pre-Duty: </span>
                  <span className={`font-medium ${duty.preDutyAwakeHours > 17 ? 'text-critical' : duty.preDutyAwakeHours > 14 ? 'text-warning' : 'text-foreground'}`}>
                    {duty.preDutyAwakeHours.toFixed(1)}h
                  </span>
                </div>
              </div>
            )}
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
