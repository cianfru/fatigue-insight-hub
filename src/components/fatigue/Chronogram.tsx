import { useState } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DutyAnalysis } from '@/types/fatigue';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChronogramProps {
  duties: DutyAnalysis[];
  onDutySelect: (duty: DutyAnalysis) => void;
  selectedDuty: DutyAnalysis | null;
}

type DisplayMode = 'heatmap' | 'timeline' | 'combined';

export function Chronogram({ duties, onDutySelect, selectedDuty }: ChronogramProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('heatmap');
  const [infoOpen, setInfoOpen] = useState(false);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-success hover:bg-success/80';
      case 'MODERATE':
        return 'bg-warning hover:bg-warning/80';
      case 'HIGH':
        return 'bg-high hover:bg-high/80';
      case 'CRITICAL':
        return 'bg-critical hover:bg-critical/80';
      default:
        return 'bg-muted hover:bg-muted/80';
    }
  };

  const getPerformanceGradient = (performance: number) => {
    if (performance >= 70) return 'from-success to-success/70';
    if (performance >= 60) return 'from-warning to-warning/70';
    if (performance >= 50) return 'from-high to-high/70';
    return 'from-critical to-critical/70';
  };

  return (
    <Card variant="glass">
      <CardHeader>
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
              🎨 Performance Heatmap
            </Button>
            <Button
              variant={displayMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('timeline')}
              className="text-xs"
            >
              📊 Duty/Rest Timeline
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
              <p className="mb-2">Each bar represents a duty day. Colors indicate fatigue risk:</p>
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success" /> Low Risk</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-warning" /> Moderate</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-high" /> High</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-critical" /> Critical</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Duty Analysis Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Duty Analysis</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {duties.map((duty, index) => (
              <button
                key={index}
                onClick={() => onDutySelect(duty)}
                className={cn(
                  "group relative rounded-lg p-3 text-left transition-all duration-200 text-foreground",
                  getRiskColor(duty.overallRisk),
                  selectedDuty?.date.getTime() === duty.date.getTime()
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : 'hover:scale-105'
                )}
              >
                <div className="text-xs font-medium text-foreground">
                  {duty.dayOfWeek}, {format(duty.date, 'MMM dd')}
                </div>
                {displayMode !== 'timeline' && (
                  <div className="mt-1 text-xs opacity-80">
                    {duty.minPerformance.toFixed(0)}%
                  </div>
                )}
                {displayMode === 'combined' && (
                  <div className="mt-1">
                    <div
                      className={cn(
                        "h-1 rounded-full bg-gradient-to-r",
                        getPerformanceGradient(duty.minPerformance)
                      )}
                      style={{ width: `${duty.minPerformance}%` }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
