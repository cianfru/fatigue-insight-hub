import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/fatigue/Header';
import { Footer } from '@/components/fatigue/Footer';
import { WelcomePage } from '@/components/fatigue/WelcomePage';
import { DashboardContent } from '@/components/fatigue/DashboardContent';
import { MathematicalModelPage } from '@/components/fatigue/MathematicalModelPage';
import { FatigueSciencePage } from '@/components/fatigue/FatigueSciencePage';

import { ResearchReferencesPage } from '@/components/fatigue/ResearchReferencesPage';
import { PilotSettings, UploadedFile, AnalysisResults, DutyAnalysis } from '@/types/fatigue';
import { mockAnalysisResults } from '@/data/mockAnalysisData';
import { useTheme } from '@/hooks/useTheme';
import { analyzeRoster } from '@/lib/api-client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const Index = () => {
  const { theme, setTheme } = useTheme();

  const isoToHHmm = (iso: string) => {
    if (!iso) return '';
    if (iso.length >= 16 && iso.includes('T')) return iso.slice(11, 16);
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
        settings.homeBase,
        settings.configPreset
      );
      
      console.log('Analysis complete:', result);
      console.log('First duty segments:', result.duties[0]?.segments);
      console.log('Sample segment times:', result.duties[0]?.segments[0]?.departure_time, result.duties[0]?.segments[0]?.arrival_time);
      
      const analysisMonth = result.duties.length > 0 
        ? parseISO(result.duties[0].date) 
        : settings.selectedMonth;
      
      setAnalysisResults({
        generatedAt: new Date(),
        month: analysisMonth,
        pilotId: result.pilot_id || undefined,
        pilotName: result.pilot_name || undefined,
        pilotBase: result.pilot_base || undefined,
        pilotAircraft: result.pilot_aircraft || undefined,
        statistics: {
          totalDuties: result.total_duties,
          totalSectors: result.total_sectors,
          totalDutyHours: result.total_duty_hours,
          totalBlockHours: result.total_block_hours,
          highRiskDuties: result.high_risk_duties,
          criticalRiskDuties: result.critical_risk_duties,
          maxSleepDebt: result.max_sleep_debt,
        },
        restDaysSleep: result.rest_days_sleep?.map(restDay => ({
          date: parseISO(restDay.date),
          sleepBlocks: restDay.sleep_blocks.map(block => ({
            sleepStartTime: block.sleep_start_time,
            sleepEndTime: block.sleep_end_time,
            sleepStartIso: block.sleep_start_iso,
            sleepEndIso: block.sleep_end_iso,
            sleepType: block.sleep_type,
            durationHours: block.duration_hours,
            effectiveHours: block.effective_hours,
            qualityFactor: block.quality_factor,
          })),
          totalSleepHours: restDay.total_sleep_hours,
          effectiveSleepHours: restDay.effective_sleep_hours,
          sleepEfficiency: restDay.sleep_efficiency,
          strategyType: restDay.strategy_type,
          confidence: restDay.confidence,
        })),
        duties: result.duties.map(duty => ({
          date: parseISO(duty.date),
          dateString: duty.date,
          dayOfWeek: format(parseISO(duty.date), 'EEE'),
          reportTimeUtc: duty.report_time_utc,
          dutyHours: duty.duty_hours,
          blockHours: duty.segments.reduce((sum, seg) => sum + (seg.block_hours || 0), 0),
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
          sleepEstimate: (duty.sleep_quality ?? duty.sleep_estimate) ? (() => {
            const sleep = duty.sleep_quality ?? duty.sleep_estimate;
            if (!sleep) return undefined;
            
            const sleepBlocks = (sleep as unknown as Record<string, unknown>).sleep_blocks as Array<{ sleep_start_iso?: string; sleep_end_iso?: string }> | undefined;
            const firstBlock = sleepBlocks?.[0];
            const sleepStartIso = sleep.sleep_start_iso ?? firstBlock?.sleep_start_iso;
            const sleepEndIso = sleep.sleep_end_iso ?? firstBlock?.sleep_end_iso;
            
            const sleepRecord = sleep as unknown as Record<string, unknown>;
            const sleepStartDay = sleepRecord.sleep_start_day as number | undefined;
            const sleepStartHour = sleepRecord.sleep_start_hour as number | undefined;
            const sleepEndDay = sleepRecord.sleep_end_day as number | undefined;
            const sleepEndHour = sleepRecord.sleep_end_hour as number | undefined;
            
            return {
              totalSleepHours: sleep.total_sleep_hours,
              effectiveSleepHours: sleep.effective_sleep_hours,
              sleepEfficiency: sleep.sleep_efficiency,
              woclOverlapHours: sleep.wocl_overlap_hours,
              sleepStrategy: sleep.sleep_strategy,
              confidence: sleep.confidence,
              warnings: sleep.warnings,
              sleepStartTime: sleep.sleep_start_time,
              sleepEndTime: sleep.sleep_end_time,
              sleepStartIso,
              sleepEndIso,
              sleepStartDay,
              sleepStartHour,
              sleepEndDay,
              sleepEndHour,
            };
          })() : undefined,
          flightSegments: duty.segments.map(seg => ({
            flightNumber: seg.flight_number,
            departure: seg.departure,
            arrival: seg.arrival,
            departureTime: seg.departure_time_local,
            arrivalTime: seg.arrival_time_local,
            blockHours: seg.block_hours,
            performance: duty.avg_performance,
          })),
        })),
      });
      
      toast.success('Analysis complete!');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed: ' + (error as Error).message);
      
      setAnalysisResults({
        ...mockAnalysisResults,
        month: settings.selectedMonth,
      });
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
      
      {/* Main Navigation Tabs */}
      <Tabs defaultValue="overview" className="flex flex-1 flex-col">
        <div className="border-b border-border bg-card/30 backdrop-blur-sm">
          <div className="px-6">
            <TabsList className="h-12 w-full justify-start gap-1 rounded-none border-0 bg-transparent p-0">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="dashboard" 
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="model" 
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Model
              </TabsTrigger>
              <TabsTrigger 
                value="science" 
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Science
              </TabsTrigger>
              <TabsTrigger 
                value="research" 
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                References
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="flex-1 mt-0">
          <WelcomePage />
        </TabsContent>

        <TabsContent value="dashboard" className="flex-1 mt-0">
          <DashboardContent
            settings={settings}
            onSettingsChange={handleSettingsChange}
            uploadedFile={uploadedFile}
            onFileUpload={handleFileUpload}
            onRemoveFile={handleRemoveFile}
            onRunAnalysis={handleRunAnalysis}
            isAnalyzing={isAnalyzing}
            analysisResults={analysisResults}
            selectedDuty={selectedDuty}
            onDutySelect={handleDutySelect}
            drawerOpen={drawerOpen}
            onDrawerOpenChange={setDrawerOpen}
          />
        </TabsContent>

        <TabsContent value="model" className="flex-1 mt-0">
          <MathematicalModelPage />
        </TabsContent>

        <TabsContent value="science" className="flex-1 mt-0">
          <FatigueSciencePage />
        </TabsContent>

        <TabsContent value="research" className="flex-1 mt-0">
          <ResearchReferencesPage />
        </TabsContent>
      </Tabs>

      <Footer />
    </div>
  );
};

export default Index;
