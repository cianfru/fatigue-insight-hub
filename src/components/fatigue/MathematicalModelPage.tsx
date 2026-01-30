import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MathematicalModelPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Mathematical Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-xl font-semibold mb-2">Documentation Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              This section will contain detailed documentation about the Borbély two-process 
              model, sleep homeostasis equations, and circadian rhythm calculations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
