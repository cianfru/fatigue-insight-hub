import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function WelcomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <Card variant="glass">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Aerowake</CardTitle>
          <p className="text-muted-foreground mt-2">
            Biomathematical Fatigue Prediction for Aviation Safety
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-2">
            <Badge variant="info">Borbély Two-Process Model</Badge>
            <Badge variant="success">EASA ORO.FTL Compliant</Badge>
          </div>
          
          <div className="text-center text-muted-foreground">
            <p>
              Aerowake uses validated biomathematical models to predict pilot fatigue levels 
              throughout duty periods, helping identify high-risk operations before they occur.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-8">
            <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
              <h3 className="font-semibold">Upload Roster</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Import your flight schedule from PDF or CSV
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
              <h3 className="font-semibold">Analyze Fatigue</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Run biomathematical predictions on each duty
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
              <h3 className="font-semibold">Review Results</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Identify risks and optimize your schedule
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Navigate to the <strong>Dashboard</strong> tab to begin your analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
