import { AlertTriangle, Plane, Clock, Moon, BedDouble } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DutyAnalysis } from '@/types/fatigue';
import { format } from 'date-fns';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    <Card variant="glow" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">
          {format(duty.date, 'EEEE, MMMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{format(duty.date, 'dd-MMM-yyyy')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Duty Hours</p>
            <p className="font-medium">{duty.dutyHours.toFixed(1)}h</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Sectors</p>
            <p className="font-medium">{duty.sectors}</p>
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
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Sleep Debt</p>
            </div>
            <p className={`font-medium ${duty.sleepDebt > 5 ? 'text-critical' : duty.sleepDebt > 3 ? 'text-warning' : 'text-foreground'}`}>
              {duty.sleepDebt.toFixed(1)}h
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Moon className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">WOCL Exposure</p>
            </div>
            <p className={`font-medium ${duty.woclExposure > 2 ? 'text-critical' : duty.woclExposure > 1 ? 'text-warning' : 'text-foreground'}`}>
              {duty.woclExposure.toFixed(1)}h
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <BedDouble className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Prior Sleep</p>
            </div>
            <p className="font-medium">{duty.priorSleep.toFixed(1)}h</p>
          </div>
        </div>

        {/* Flight Segments */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-medium">
            <Plane className="h-4 w-4 text-primary" />
            Flight Segments
          </h4>
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
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{segment.departureTime} - {segment.arrivalTime}</span>
                  <Badge variant={segment.performance < 50 ? 'critical' : segment.performance < 60 ? 'warning' : 'success'}>
                    {segment.performance.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="space-y-3">
          <h4 className="font-medium">Risk Assessment</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Overall Risk</p>
              <div className="flex items-center gap-2">
                <span>{getRiskEmoji(duty.overallRisk)}</span>
                {getRiskBadge(duty.overallRisk)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Minimum Performance Risk</p>
              {getRiskBadge(duty.minPerformanceRisk)}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Landing Risk</p>
              {getRiskBadge(duty.landingRisk)}
            </div>
          </div>
        </div>

        {/* SMS Reportable Warning */}
        {duty.smsReportable && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
            <div>
              <p className="font-medium text-warning">SMS Reportable</p>
              <p className="text-sm text-muted-foreground">
                File fatigue report per EASA ORO.FTL.120
              </p>
            </div>
          </div>
        )}

        {/* Detailed Assessment Collapsible */}
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
      </CardContent>
    </Card>
  );
}
