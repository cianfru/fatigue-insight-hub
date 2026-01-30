import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ComponentReferencePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📚</span>
            Component Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🧩</div>
            <h3 className="text-xl font-semibold mb-2">Documentation Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              This section will provide reference documentation for all UI components, 
              charts, and visualizations used in the fatigue analysis dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
