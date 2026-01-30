import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FatigueSciencePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🧠</span>
            Fatigue Science
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">💤</div>
            <h3 className="text-xl font-semibold mb-2">Documentation Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              This section will cover the science of fatigue, sleep physiology, 
              circadian rhythms, and their effects on pilot performance and safety.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
