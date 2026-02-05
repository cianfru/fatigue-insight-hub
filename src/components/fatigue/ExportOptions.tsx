import { useState } from 'react';
import { Calendar, FileText, Table, Download, Apple, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { downloadIcsFile, openGoogleCalendarBatch } from '@/lib/calendar-export';
import { DutyAnalysis } from '@/types/fatigue';
import { toast } from 'sonner';

interface ExportOptionsProps {
  duties?: DutyAnalysis[];
}

export function ExportOptions({ duties = [] }: ExportOptionsProps) {
  const [isExportingIcs, setIsExportingIcs] = useState(false);

  const handleIcsExport = async () => {
    if (duties.length === 0) {
      toast.error('No duties to export');
      return;
    }
    
    setIsExportingIcs(true);
    try {
      await downloadIcsFile(duties);
      toast.success('Calendar file downloaded! Import it into Apple Calendar or any iCal-compatible app.');
    } catch (error) {
      toast.error('Failed to generate calendar file');
      console.error(error);
    } finally {
      setIsExportingIcs(false);
    }
  };

  const handleGoogleCalendarExport = () => {
    if (duties.length === 0) {
      toast.error('No duties to export');
      return;
    }
    
    openGoogleCalendarBatch(duties);
    toast.info('Opening Google Calendar... For bulk import, use the iCal file.');
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Step 4: Download Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Apple Calendar / iCal Export */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
            onClick={handleIcsExport}
            disabled={isExportingIcs || duties.length === 0}
          >
            {isExportingIcs ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Apple className="h-8 w-8 text-primary" />
            )}
            <div className="text-center">
              <p className="font-medium">Apple Calendar</p>
              <p className="text-xs text-muted-foreground">Download .ics file for iCal</p>
            </div>
          </Button>

          {/* Google Calendar Export */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
            onClick={handleGoogleCalendarExport}
            disabled={duties.length === 0}
          >
            <Calendar className="h-8 w-8 text-primary" />
            <div className="text-center">
              <p className="font-medium">Google Calendar</p>
              <p className="text-xs text-muted-foreground">Add events to Google Calendar</p>
            </div>
          </Button>

          {/* PDF Report (Coming Soon) */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
            disabled
          >
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">PDF Report</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </Button>

          {/* Excel Export (Coming Soon) */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
            disabled
          >
            <Table className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Excel Export</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </Button>
        </div>

        {duties.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {duties.length} duties available for export
          </p>
        )}
      </CardContent>
    </Card>
  );
}
