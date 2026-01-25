import { Settings, Info, BookOpen, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PilotSettings } from '@/types/fatigue';
import { useState } from 'react';

interface SettingsSidebarProps {
  settings: PilotSettings;
  onSettingsChange: (settings: Partial<PilotSettings>) => void;
}

const airports = [
  { code: 'DOH', name: 'Doha, Qatar' },
  { code: 'DXB', name: 'Dubai, UAE' },
  { code: 'LHR', name: 'London Heathrow, UK' },
  { code: 'JFK', name: 'New York JFK, USA' },
  { code: 'SIN', name: 'Singapore' },
  { code: 'CDG', name: 'Paris CDG, France' },
];

const configPresets = [
  { value: 'easa-default', label: 'Default (EASA)' },
  { value: 'faa-standard', label: 'FAA Standard' },
  { value: 'custom', label: 'Custom Configuration' },
];

export function SettingsSidebar({ settings, onSettingsChange }: SettingsSidebarProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto p-4">
      {/* Settings Card */}
      <Card variant="glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-primary" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pilotId" className="text-xs text-muted-foreground">Pilot ID</Label>
            <Input
              id="pilotId"
              value={settings.pilotId}
              onChange={(e) => onSettingsChange({ pilotId: e.target.value })}
              placeholder="P12345"
              className="h-9 bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="homeBase" className="text-xs text-muted-foreground">Home Base</Label>
            <Select
              value={settings.homeBase}
              onValueChange={(value) => onSettingsChange({ homeBase: value })}
            >
              <SelectTrigger className="h-9 bg-secondary/50">
                <SelectValue placeholder="Select home base" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {airports.map((airport) => (
                  <SelectItem key={airport.code} value={airport.code}>
                    {airport.code} - {airport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Period Card */}
      <Card variant="glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-primary">📅</span>
            Analysis Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Select period:</Label>
            <div className="flex gap-2">
              <Button
                variant={settings.analysisType === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSettingsChange({ analysisType: 'single' })}
                className="flex-1 text-xs"
              >
                Single Month
              </Button>
              <Button
                variant={settings.analysisType === 'range' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSettingsChange({ analysisType: 'range' })}
                className="flex-1 text-xs"
              >
                Date Range
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Select Month</Label>
            <Input
              type="month"
              value={settings.selectedMonth.toISOString().slice(0, 7)}
              onChange={(e) => onSettingsChange({ selectedMonth: new Date(e.target.value) })}
              className="h-9 bg-secondary/50"
            />
          </div>
        </CardContent>
      </Card>


      {/* Model Configuration Card */}
      <Card variant="glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-primary">🔬</span>
            Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Configuration Preset</Label>
            <Select
              value={settings.configPreset}
              onValueChange={(value) => onSettingsChange({ configPreset: value })}
            >
              <SelectTrigger className="h-9 bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {configPresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Configuration Details
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-md bg-secondary/30 p-3 text-xs text-muted-foreground">
                <p>EASA ORO.FTL compliant configuration using Borbély two-process model parameters.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* How to Use Card */}
      <Collapsible open={howToOpen} onOpenChange={setHowToOpen}>
        <Card variant="glass">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-4 hover:bg-secondary/20">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  How to Use
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ol className="list-inside list-decimal space-y-2 text-xs text-muted-foreground">
                <li>Configure your pilot settings and home base</li>
                <li>Select the analysis period</li>
                <li>Upload your roster file (PDF or CSV)</li>
                <li>Click "Run Analysis" to generate fatigue predictions</li>
                <li>Review results and export reports as needed</li>
              </ol>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
