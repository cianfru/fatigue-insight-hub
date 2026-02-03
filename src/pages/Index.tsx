import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/fatigue/Header';
import { Footer } from '@/components/fatigue/Footer';
import { WelcomePage } from '@/components/fatigue/WelcomePage';
import { DashboardContent } from '@/components/fatigue/DashboardContent';
import { MathematicalModelPage } from '@/components/fatigue/MathematicalModelPage';
import { FatigueSciencePage } from '@/components/fatigue/FatigueSciencePage';
import { LandingPage } from '@/components/landing/LandingPage';

import { ResearchReferencesPage } from '@/components/fatigue/ResearchReferencesPage';
import { PilotSettings, UploadedFile, AnalysisResults, DutyAnalysis } from '@/types/fatigue';
import { mockAnalysisResults } from '@/data/mockAnalysisData';
import { useTheme } from '@/hooks/useTheme';
import { analyzeRoster } from '@/lib/api-client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const Index = () => {
  const [showLanding, setShowLanding] = useState(true);
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

  // Extract HH:mm from ISO timestamp and append 'Z' for Zulu time display
  const isoToZulu = (iso: string) => {
    const hhmm = isoToHHmm(iso);
    return hhmm ? `${hhmm}Z` : '';
  };

  // Calculate per-segment performance based on temporal position within duty
  // This accounts for cumulative fatigue and time-on-task degradation
  const calculateSegmentPerformances = (duty: {
    segments: Array<{ departure_time: string; arrival_time: string; block_hours?: number }>;
    report_time_utc: string;
    min_performance: number;
    avg_performance: number;
    landing_performance: number | null;
    duty_hours: number;
  }): number[] => {
    if (duty.segments.length === 0) return [];
    if (duty.segments.length === 1) {
      // Single sector - use average performance
      return [duty.avg_performance];
    }

    // Parse ISO timestamps to get minutes since duty start
    const parseIsoToDate = (iso: string): Date | null => {
      try {
        return parseISO(iso);
      } catch {
        return null;
      }
    };

    const reportTime = parseIsoToDate(duty.report_time_utc);
    if (!reportTime) {
      // Fallback if parsing fails
      return duty.segments.map(() => duty.avg_performance);
    }

    // Calculate cumulative flight hours at each segment's landing
    const segmentEndHours: number[] = [];
    let cumulativeHours = 0;

    duty.segments.forEach((seg, idx) => {
      const arrivalTime = parseIsoToDate(seg.arrival_time);
      if (arrivalTime) {
        // Hours from report to this segment's arrival
        const hoursFromReport = (arrivalTime.getTime() - reportTime.getTime()) / (1000 * 60 * 60);
        segmentEndHours.push(hoursFromReport);
      } else {
        // Fallback: estimate based on cumulative block hours
        const blockHours = seg.block_hours || 1;
        cumulativeHours += blockHours + 0.5; // Add ground time estimate
        segmentEndHours.push(cumulativeHours);
      }
    });

    // Estimate performance at each segment's landing
    // Use linear degradation from first segment (higher) to last segment (duty.landing_performance)
    const finalLanding = duty.landing_performance ?? duty.min_performance;
    const totalDutyHours = duty.duty_hours;

    // Estimate starting performance (before first landing)
    // Assuming ~5-8% degradation over the duty, first segment should be higher
    const performanceDrop = duty.avg_performance - finalLanding;
    const estimatedStartPerf = Math.min(100, duty.avg_performance + performanceDrop * 0.5);

    return segmentEndHours.map((hoursElapsed) => {
      // Linear interpolation from start to final landing
      const fraction = totalDutyHours > 0 ? hoursElapsed / totalDutyHours : 0;
      const performance = estimatedStartPerf - (estimatedStartPerf - finalLanding) * fraction;
      return Math.max(0, Math.min(100, performance));
    });
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

      // Diagnostic: Check for layover scenarios and sleep recognition
      console.group('🛏️ Layover Sleep Diagnostics');
      result.duties.forEach((duty, idx) => {
        const firstSeg = duty.segments[0];
        const lastSeg = duty.segments[duty.segments.length - 1];
        const nextDuty = result.duties[idx + 1];

        // Check if this duty ends away from base
        const endsAwayFromBase = lastSeg && lastSeg.arrival !== settings.homeBase;

        // Check if next duty starts at same location (potential layover)
        const isLayover = endsAwayFromBase && nextDuty?.segments[0]?.departure === lastSeg.arrival;

        if (isLayover || endsAwayFromBase) {
          console.log(`📅 ${duty.date} (Duty ${idx + 1}/${result.duties.length})`);
          console.log(`  Route: ${firstSeg?.departure} → ${lastSeg?.arrival}`);
          console.log(`  Ends away from base: ${endsAwayFromBase ? 'YES' : 'NO'}`);
          console.log(`  Layover detected: ${isLayover ? 'YES' : 'NO'}`);
          if (nextDuty) {
            const layoverHours = (new Date(nextDuty.report_time_utc).getTime() - new Date(duty.release_time_utc).getTime()) / (1000 * 60 * 60);
            console.log(`  Time to next duty: ${layoverHours.toFixed(1)}h`);
            console.log(`  Next duty prior_sleep: ${nextDuty.prior_sleep}h`);
            console.log(`  Next duty has sleep_estimate: ${!!(nextDuty.sleep_quality ?? nextDuty.sleep_estimate)}`);
            if (nextDuty.sleep_quality ?? nextDuty.sleep_estimate) {
              const sleep = nextDuty.sleep_quality ?? nextDuty.sleep_estimate;
              console.log(`  Next duty sleep hours: ${sleep?.total_sleep_hours}h effective`);
              console.log(`  Sleep strategy: ${sleep?.sleep_strategy}`);
            }
          }
        }
      });
      console.groupEnd();

      const analysisMonth = result.duties.length > 0
        ? parseISO(result.duties[0].date)
        : settings.selectedMonth;

      const parseHHmmToMinutes = (t: string | undefined): number | null => {
        if (!t) return null;
        const [h, m] = t.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        return h * 60 + m;
      };

      const computeSegmentBlockHours = (seg: { block_hours?: number; departure_time_local?: string; arrival_time_local?: string }) => {
        if (typeof seg.block_hours === 'number' && Number.isFinite(seg.block_hours) && seg.block_hours > 0) return seg.block_hours;
        const dep = parseHHmmToMinutes(seg.departure_time_local);
        const arr = parseHHmmToMinutes(seg.arrival_time_local);
        if (dep == null || arr == null) return 0;
        let diff = arr - dep;
        if (diff < 0) diff += 24 * 60;
        return Math.max(0, diff / 60);
      };

      const computedBlockHoursFromSegments = result.duties.reduce(
        (sum, d) => sum + d.segments.reduce((s, seg) => s + computeSegmentBlockHours(seg), 0),
        0
      );

      console.log('total_block_hours (backend):', result.total_block_hours);
      console.log('computedBlockHoursFromSegments:', computedBlockHoursFromSegments);
      
      setAnalysisResults({
        generatedAt: new Date(),
        month: analysisMonth,
        analysisId: result.analysis_id || undefined,
        pilotId: result.pilot_id || undefined,
        pilotName: result.pilot_name || undefined,
        pilotBase: result.pilot_base || undefined,
        pilotAircraft: result.pilot_aircraft || undefined,
        statistics: {
          totalDuties: result.total_duties,
          totalSectors: result.total_sectors,
          totalDutyHours: result.total_duty_hours,
          totalBlockHours:
            Number.isFinite(result.total_block_hours) && result.total_block_hours > 0
              ? result.total_block_hours
              : computedBlockHoursFromSegments,
          highRiskDuties: result.high_risk_duties,
          criticalRiskDuties: result.critical_risk_duties,
          maxSleepDebt: result.max_sleep_debt,
          totalPinchEvents: result.total_pinch_events || 0,
          avgSleepPerNight: result.avg_sleep_per_night || 0,
          worstPerformance: result.worst_performance || 0,
          worstDutyId: result.worst_duty_id || undefined,
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
        duties: result.duties.map(duty => {
          // Calculate per-segment performance based on temporal position
          const segmentPerformances = calculateSegmentPerformances(duty);

          return {
            dutyId: duty.duty_id,
            date: parseISO(duty.date),
            dateString: duty.date,
            dayOfWeek: format(parseISO(duty.date), 'EEE'),
            reportTimeUtc: duty.report_time_utc,
            reportTimeLocal: duty.report_time_local,
            releaseTimeLocal: duty.release_time_local,
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
            
            // Extract detailed sleep quality data (snake_case from backend)
            const explanation = sleepRecord.explanation as string | undefined;
            const confidenceBasis = sleepRecord.confidence_basis as string | undefined;
            const qualityFactors = sleepRecord.quality_factors as {
              base_efficiency: number;
              wocl_boost: number;
              late_onset_penalty: number;
              recovery_boost: number;
              time_pressure_factor: number;
              insufficient_penalty: number;
            } | undefined;
            const references = sleepRecord.references as Array<{
              key: string;
              short: string;
              full: string;
            }> | undefined;
            
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
              // Detailed sleep quality info
              explanation,
              confidenceBasis,
              qualityFactors,
              references,
            };
          })() : undefined,
          flightSegments: duty.segments.map((seg, idx) => ({
            flightNumber: seg.flight_number,
            departure: seg.departure,
            arrival: seg.arrival,
            departureTime: seg.departure_time_local,
            arrivalTime: seg.arrival_time_local,
            departureTimeUtc: isoToZulu(seg.departure_time),
            arrivalTimeUtc: isoToZulu(seg.arrival_time),
            blockHours: seg.block_hours,
            performance: segmentPerformances[idx] || duty.avg_performance,
          })),
        };
        }),
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

  // Show landing page first
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

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
