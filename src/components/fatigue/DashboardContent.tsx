import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsSidebar } from '@/components/fatigue/SettingsSidebar';
import { StatisticsCards } from '@/components/fatigue/StatisticsCards';
import { Chronogram } from '@/components/fatigue/Chronogram';
import { PerformanceTimeline } from '@/components/fatigue/PerformanceTimeline';
import { RouteNetworkMapbox } from '@/components/fatigue/RouteNetworkMapbox';
import { ExportOptions } from '@/components/fatigue/ExportOptions';
import { PinchEventAlerts } from '@/components/fatigue/PinchEventAlerts';
import { BodyClockDriftChart } from '@/components/fatigue/BodyClockDriftChart';
import { SleepDebtTrendChart } from '@/components/fatigue/SleepDebtTrendChart';
import { DutyDetailsDrawer } from '@/components/fatigue/DutyDetailsDrawer';
import { PilotSettings, UploadedFile, AnalysisResults, DutyAnalysis } from '@/types/fatigue';

interface DashboardContentProps {
  settings: PilotSettings;
  onSettingsChange: (newSettings: Partial<PilotSettings>) => void;
  uploadedFile: UploadedFile | null;
  onFileUpload: (file: UploadedFile, actualFile: File) => void;
  onRemoveFile: () => void;
  onRunAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
  analysisResults: AnalysisResults | null;
  selectedDuty: DutyAnalysis | null;
  onDutySelect: (duty: DutyAnalysis) => void;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
}

export function DashboardContent({
  settings,
  onSettingsChange,
  uploadedFile,
  onFileUpload,
  onRemoveFile,
  onRunAnalysis,
  isAnalyzing,
  analysisResults,
  selectedDuty,
  onDutySelect,
  drawerOpen,
  onDrawerOpenChange,
}: DashboardContentProps) {
  return (
    <div className="flex flex-1">
      {/* Settings Sidebar with Upload */}
      <SettingsSidebar 
        settings={settings} 
        onSettingsChange={onSettingsChange}
        uploadedFile={uploadedFile}
        onFileUpload={onFileUpload}
        onRemoveFile={onRemoveFile}
        onRunAnalysis={onRunAnalysis}
        isAnalyzing={isAnalyzing}
        hasResults={!!analysisResults}
        pilotInfo={analysisResults ? {
          name: analysisResults.pilotName,
          id: analysisResults.pilotId,
          base: analysisResults.pilotBase || settings.homeBase,
          aircraft: analysisResults.pilotAircraft,
        } : undefined}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Analysis Results */}
          {analysisResults && (
            <div className="space-y-6 animate-fade-in">
              {/* Section 1: Overview - Summary Statistics */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-primary">📊</span>
                    Overview - Summary Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatisticsCards statistics={analysisResults.statistics} />

                  {/* Critical Warning */}
                  {analysisResults.statistics.criticalRiskDuties > 0 && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-critical/50 bg-critical/10 p-4">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-critical" />
                      <div>
                        <p className="font-medium text-critical">
                          CRITICAL: {analysisResults.statistics.criticalRiskDuties} duties with critical risk detected
                        </p>
                        <p className="text-sm text-muted-foreground">
                          SMS reporting required per EASA ORO.FTL.120
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Pinch Event Alerts */}
              <PinchEventAlerts duties={analysisResults.duties} />

              {/* Section 3: Route Network Map */}
              <RouteNetworkMapbox duties={analysisResults.duties} homeBase={settings.homeBase} theme={settings.theme} />

              {/* Section 4: Analytics Tabs - Performance Timeline, Body Clock Drift, Sleep Debt Trend */}
              <Tabs defaultValue="performance" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="performance">Performance Timeline</TabsTrigger>
                  <TabsTrigger value="circadian">Body Clock Drift</TabsTrigger>
                  <TabsTrigger value="sleepdebt">Sleep Debt Trend</TabsTrigger>
                </TabsList>
                <TabsContent value="performance" className="mt-4">
                  <PerformanceTimeline duties={analysisResults.duties} month={analysisResults.month} />
                </TabsContent>
                <TabsContent value="circadian" className="mt-4">
                  <BodyClockDriftChart 
                    duties={analysisResults.duties} 
                    month={analysisResults.month} 
                    homeBase={settings.homeBase}
                  />
                </TabsContent>
                <TabsContent value="sleepdebt" className="mt-4">
                  <SleepDebtTrendChart duties={analysisResults.duties} month={analysisResults.month} />
                </TabsContent>
              </Tabs>

              {/* Section 5: Monthly Chronogram */}
              <Chronogram
                duties={analysisResults.duties}
                statistics={analysisResults.statistics}
                month={analysisResults.month}
                pilotId={settings.pilotId}
                onDutySelect={onDutySelect}
                selectedDuty={selectedDuty}
                restDaysSleep={analysisResults.restDaysSleep}
              />

              {/* Section 6: Export Options */}
              <ExportOptions />
            </div>
          )}

          {/* Empty state when no results */}
          {!analysisResults && uploadedFile && (
            <Card variant="glass" className="p-12 text-center">
              <div className="space-y-4">
                <span className="text-6xl">📊</span>
                <h3 className="text-xl font-semibold">Ready to Analyze</h3>
                <p className="text-muted-foreground">
                  Click "Run Analysis" in the sidebar to generate your fatigue analysis.
                </p>
              </div>
            </Card>
          )}

          {!uploadedFile && (
            <Card variant="glass" className="p-12 text-center">
              <div className="space-y-4">
                <span className="text-6xl">📄</span>
                <h3 className="text-xl font-semibold">No Roster Uploaded</h3>
                <p className="text-muted-foreground">
                  Upload a roster file using the sidebar to get started.
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Duty Details Drawer */}
      <DutyDetailsDrawer 
        duty={selectedDuty} 
        analysisId={analysisResults?.analysisId}
        open={drawerOpen} 
        onOpenChange={onDrawerOpenChange} 
      />
    </div>
  );
}
