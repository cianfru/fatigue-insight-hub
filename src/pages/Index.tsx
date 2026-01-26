import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/fatigue/Header';
import { Footer } from '@/components/fatigue/Footer';
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
import { mockAnalysisResults } from '@/data/mockAnalysisData';
import { useTheme } from '@/hooks/useTheme';

const Index = () => {
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState<PilotSettings>({
    pilotId: 'P12345',
    homeBase: 'DOH',
    analysisType: 'single',
    selectedMonth: new Date(2026, 1, 1),
    theme: 'dark',
    configPreset: 'easa-default',
  });

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>({
    name: 'Roster feb 2026.pdf',
    size: 13318,
    type: 'PDF',
  });

  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(mockAnalysisResults);
  const [selectedDuty, setSelectedDuty] = useState<DutyAnalysis | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSettingsChange = (newSettings: Partial<PilotSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) {
        setTheme(newSettings.theme);
      }
      return updated;
    });
  };

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    setAnalysisResults(null);
    setSelectedDuty(null);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setAnalysisResults(null);
    setSelectedDuty(null);
  };

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setAnalysisResults(mockAnalysisResults);
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleDutySelect = (duty: DutyAnalysis) => {
    setSelectedDuty(duty);
    setDrawerOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header theme={settings.theme} onThemeChange={(theme) => handleSettingsChange({ theme })} />
      
      <div className="flex flex-1">
        {/* Settings Sidebar with Upload */}
        <SettingsSidebar 
          settings={settings} 
          onSettingsChange={handleSettingsChange}
          uploadedFile={uploadedFile}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          onRunAnalysis={handleRunAnalysis}
          isAnalyzing={isAnalyzing}
          hasResults={!!analysisResults}
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
                <RouteNetworkMapbox duties={analysisResults.duties} homeBase={settings.homeBase} />

                {/* Section 4: Analytics Tabs - Performance Timeline, Body Clock Drift, Sleep Debt Trend */}
                <Tabs defaultValue="performance" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="performance">Performance Timeline</TabsTrigger>
                    <TabsTrigger value="circadian">Body Clock Drift</TabsTrigger>
                    <TabsTrigger value="sleepdebt">Sleep Debt Trend</TabsTrigger>
                  </TabsList>
                  <TabsContent value="performance" className="mt-4">
                    <PerformanceTimeline duties={analysisResults.duties} month={settings.selectedMonth} />
                  </TabsContent>
                  <TabsContent value="circadian" className="mt-4">
                    <BodyClockDriftChart 
                      duties={analysisResults.duties} 
                      month={settings.selectedMonth} 
                      homeBase={settings.homeBase}
                    />
                  </TabsContent>
                  <TabsContent value="sleepdebt" className="mt-4">
                    <SleepDebtTrendChart duties={analysisResults.duties} month={settings.selectedMonth} />
                  </TabsContent>
                </Tabs>

                {/* Section 5: Monthly Chronogram */}
                <Chronogram
                  duties={analysisResults.duties}
                  statistics={analysisResults.statistics}
                  month={settings.selectedMonth}
                  pilotId={settings.pilotId}
                  onDutySelect={handleDutySelect}
                  selectedDuty={selectedDuty}
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
      </div>

      {/* Duty Details Drawer */}
      <DutyDetailsDrawer 
        duty={selectedDuty} 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
      />

      <Footer />
    </div>
  );
};

export default Index;
