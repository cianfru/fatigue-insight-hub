import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DutyAnalysis } from '@/types/fatigue';
import { DutyDetails } from './DutyDetails';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { getDutyDetail } from '@/lib/api-client';

interface DutyDetailsDrawerProps {
  duty: DutyAnalysis | null;
  analysisId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DutyDetailsDrawer({ duty, analysisId, open, onOpenChange }: DutyDetailsDrawerProps) {
  const [detailedDuty, setDetailedDuty] = useState<DutyAnalysis | null>(null);

  const dutyKey = useMemo(() => {
    if (!analysisId || !duty?.dutyId) return null;
    return `${analysisId}:${duty.dutyId}`;
  }, [analysisId, duty?.dutyId]);

  // Fetch detailed duty (timeline_points etc.) when drawer opens.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Always start from the base duty passed in.
      setDetailedDuty(duty);

      if (!open) return;
      if (!analysisId || !duty?.dutyId) return;

      try {
        const detail = await getDutyDetail(analysisId, duty.dutyId);
        if (cancelled) return;

        const timelinePoints = (detail?.timeline_points ?? detail?.timelinePoints) as DutyAnalysis['timelinePoints'] | undefined;

        setDetailedDuty({
          ...duty,
          timelinePoints: Array.isArray(timelinePoints) ? timelinePoints : duty.timelinePoints,
        });
      } catch {
        // Silent fail: drawer still renders base duty data.
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, dutyKey, analysisId, duty]);

  const displayDuty = detailedDuty ?? duty;

  if (!displayDuty) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-primary">✈️</span>
              Duty Details - {displayDuty.dayOfWeek}, {format(displayDuty.date, 'MMM dd')}
            </SheetTitle>
          </div>
        </SheetHeader>
        
        {/* All content is now consolidated in DutyDetails */}
        <DutyDetails duty={displayDuty} />
      </SheetContent>
    </Sheet>
  );
}
