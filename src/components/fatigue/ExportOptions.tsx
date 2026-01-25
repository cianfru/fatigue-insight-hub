import { Calendar, FileText, Table, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ExportOptions() {
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
          >
            <Calendar className="h-8 w-8 text-primary" />
            <div className="text-center">
              <p className="font-medium">Aviation Calendar</p>
              <p className="text-xs text-muted-foreground">Multi-day duty calendar with risk levels</p>
            </div>
          </Button>

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
      </CardContent>
    </Card>
  );
}
