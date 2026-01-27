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
import { analyzeRoster } from '@/lib/api-client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const Index = () => {
  const { theme, setTheme } = useTheme();

  const isoToHHmm = (iso: string) => {
    // Backend returns ISO timestamps like "2026-02-03T04:45:00+00:00".
    // Chronogram expects "HH:mm".
    if (!iso) return '';
    // Fast-path for ISO strings.
    if (iso.length >= 16 && iso.includes('T')) return iso.slice(11, 16);
    // Fallback for other formats.
    try {
      return format(parseISO(iso), 'HH:mm');
    } catch {
      return iso;
    }
  };
  
  const [settings, setSettings] = useState<PilotSettings>({
    pilotId: 'P12345',
    homeBase: 'DOH',
    analysisType: 'single',
    selectedMonth: new Date(2026, 1, 1),
    theme: 'dark',
    configPreset: 'easa-default',
  });

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [actualFileObject, setActualFileObject] = useState<File | null>(null);

  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
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

  const handleFileUpload = (file: UploadedFile, actualFile: File) => {
    setUploadedFile(file);
    setActualFileObject(actualFile);
    setAnalysisResults(null);
    setSelectedDuty(null);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setActualFileObject(null);
    setAnalysisResults(null);
    setSelectedDuty(null);
  };

  const handleRunAnalysis = async () => {
    if (!uploadedFile || !actualFileObject) {
      toast.error('Please upload a roster file first');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      console.log('Starting analysis...');
      
      const result = await analyzeRoster(
        actualFileObject,
        settings.pilotId,
        format(settings.selectedMonth, 'yyyy-MM'),
        settings.homeBase,
        'Asia/Qatar', // TODO: Make dynamic based on homeBase
        settings.configPreset
      );
      
      console.log('Analysis complete:', result);
      console.log('First duty segments:', result.duties[0]?.segments);
      console.log('Sample segment times:', result.duties[0]?.segments[0]?.departure_time, result.duties[0]?.segments[0]?.arrival_time);
      
      // Convert API response to match frontend types
      setAnalysisResults({
        generatedAt: new Date(),
        pilotId: result.pilot_id || undefined,
        pilotName: result.pilot_name || undefined,
        pilotBase: result.pilot_base || undefined,
        pilotAircraft: result.pilot_aircraft || undefined,
        statistics: {
          totalDuties: result.total_duties,
          totalSectors: result.total_sectors,
          highRiskDuties: result.high_risk_duties,
          criticalRiskDuties: result.critical_risk_duties,
          maxSleepDebt: result.max_sleep_debt,
        },
        duties: result.duties.map(duty => ({
          date: parseISO(duty.date),
          dayOfWeek: format(parseISO(duty.date), 'EEE'),
          dutyHours: duty.duty_hours,
          sectors: duty.sectors,
          minPerformance: duty.min_performance,
          avgPerformance: duty.avg_performance,
          landingPerformance: duty.landing_performance || duty.min_performance,
          sleepDebt: duty.sleep_debt,
          woclExposure: duty.wocl_hours,
          priorSleep: duty.prior_sleep,
          overallRisk: duty.risk_level.toUpperCase() as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
          minPerformanceRisk: duty.risk_level.toUpperCase() as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
          landingRisk: duty.risk_level.toUpperCase() as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
          smsReportable: duty.is_reportable,
          maxFdpHours: duty.max_fdp_hours,
          extendedFdpHours: duty.extended_fdp_hours,
          usedDiscretion: duty.used_discretion,
          flightSegments: duty.segments.map(seg => ({
            flightNumber: seg.flight_number,
            departure: seg.departure,
            arrival: seg.arrival,
            departureTime: seg.departure_time_local,  // Already in HH:mm format, home base timezone
            arrivalTime: seg.arrival_time_local,      // Already in HH:mm format, home base timezone
            performance: duty.avg_performance,
          })),
        })),
      });
      
      toast.success('Analysis complete!');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed: ' + (error as Error).message);
      
      // Fallback to mock data for demo purposes
      setAnalysisResults(mockAnalysisResults);
    } finally {
      setIsAnalyzing(false);
    }
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
