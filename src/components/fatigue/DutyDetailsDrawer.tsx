import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DutyAnalysis } from '@/types/fatigue';
import { DutyDetails } from './DutyDetails';
import { FlightPhasePerformance } from './FlightPhasePerformance';
import { SleepRecoveryIndicator } from './SleepRecoveryIndicator';
import { PriorSleepIndicator } from './PriorSleepIndicator';
import { format } from 'date-fns';

interface DutyDetailsDrawerProps {
  duty: DutyAnalysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DutyDetailsDrawer({ duty, open, onOpenChange }: DutyDetailsDrawerProps) {
  if (!duty) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-primary">✈️</span>
              Duty Details - {duty.dayOfWeek}, {format(duty.date, 'MMM dd')}
            </SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Duty Details Card */}
          <DutyDetails duty={duty} />
          
          {/* Sleep Recovery Indicator - Strategic Sleep Estimator */}
          {duty.sleepEstimate && (
            <SleepRecoveryIndicator duty={duty} variant="detailed" />
          )}
          
          {/* Prior Sleep Indicator */}
          <PriorSleepIndicator duty={duty} variant="detailed" />
          
          {/* Flight Phase Performance */}
          <FlightPhasePerformance duty={duty} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
