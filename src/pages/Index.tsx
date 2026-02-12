import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/fatigue/Header';
import { Footer } from '@/components/fatigue/Footer';
import { DashboardContent } from '@/components/fatigue/DashboardContent';
import { InsightsContent } from '@/components/fatigue/InsightsContent';
import { LearnPage } from '@/components/fatigue/LearnPage';
import { AboutPage } from '@/components/fatigue/AboutPage';
import { LandingPage } from '@/components/landing/LandingPage';
import { AuroraBackground } from '@/components/ui/aurora-background';

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
      return [duty.avg_performance];
    }

    const parseIsoToDate = (iso: string): Date | null => {
      try {
        return parseISO(iso);
      } catch {
        return null;
      }
    };

    const reportTime = parseIsoToDate(duty.report_time_utc);
    if (!reportTime) {
      return duty.segments.map(() => duty.avg_performance);
    }

    const segmentEndHours: number[] = [];
    let cumulativeHours = 0;

    duty.segments.forEach((seg) => {
      const arrivalTime = parseIsoToDate(seg.arrival_time);
      if (arrivalTime) {
        const hoursFromReport = (arrivalTime.getTime() - reportTime.getTime()) / (1000 * 60 * 60);
        segmentEndHours.push(hoursFromReport);
      } else {
        const blockHours = seg.block_hours || 1;
        cumulativeHours += blockHours + 0.5;
        segmentEndHours.push(cumulativeHours);
      }
    });

    const finalLanding = duty.landing_performance ?? duty.min_performance;
    const totalDutyHours = duty.duty_hours;
    const performanceDrop = duty.avg_performance - finalLanding;
    const estimatedStartPerf = Math.min(100, duty.avg_performance + performanceDrop * 0.5);

    return segmentEndHours.map((hoursElapsed) => {
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      const result = await analyzeRoster(
        actualFileObject,
        settings.pilotId,
        settings.homeBase,
        settings.configPreset
      );

      // Debug logging
      result.duties.forEach((d, i) => {
        const sleep = (d as any).sleep_quality ?? (d as any).sleep_estimate;
        if (sleep) {
          console.log(`[Sleep Debug] Duty ${i} (${d.date}):`, {
            totalHours: sleep.total_sleep_hours,
            effectiveHours: sleep.effective_sleep_hours,
            strategy: sleep.sleep_strategy,
          });
        }
      });

      const analysisMonth = result.duties.length > 0 
        ? parseISO(result.duties[0].date) 
        : settings.selectedMonth;

      const parseTimeToMinutes = (t: string | undefined): number | null => {
        if (!t) return null;
        const isoMatch = t.match(/T(\d{2}):(\d{2})/);
        if (isoMatch) {
          const h = Number(isoMatch[1]);
          const m = Number(isoMatch[2]);
          if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
        }
        const parts = t.split(':').map(Number);
        if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
          return parts[0] * 60 + parts[1];
        }
        return null;
      };

      const computeSegmentBlockHours = (seg: { block_hours?: number; departure_time_local?: string; arrival_time_local?: string; departure_time?: string; arrival_time?: string }) => {
        if (typeof seg.block_hours === 'number' && Number.isFinite(seg.block_hours) && seg.block_hours > 0) return seg.block_hours;
        const dep = parseTimeToMinutes(seg.departure_time_local) ?? parseTimeToMinutes(seg.departure_time);
        const arr = parseTimeToMinutes(seg.arrival_time_local) ?? parseTimeToMinutes(seg.arrival_time);
        if (dep == null || arr == null) return 0;
        let diff = arr - dep;
        if (diff < 0) diff += 24 * 60;
        return Math.max(0, diff / 60);
      };

      const computedBlockHoursFromSegments = result.duties.reduce(
        (sum, d) => sum + d.segments.reduce((s, seg) => s + computeSegmentBlockHours(seg), 0),
        0
      );

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
            sleepStartDayHomeTz: block.sleep_start_day_home_tz ?? undefined,
            sleepStartHourHomeTz: block.sleep_start_hour_home_tz ?? undefined,
            sleepEndDayHomeTz: block.sleep_end_day_home_tz ?? undefined,
            sleepEndHourHomeTz: block.sleep_end_hour_home_tz ?? undefined,
            sleepStartTimeHomeTz: block.sleep_start_time_home_tz ?? undefined,
            sleepEndTimeHomeTz: block.sleep_end_time_home_tz ?? undefined,
            locationTimezone: block.location_timezone ?? undefined,
            environment: block.environment ?? undefined,
            sleepStartTimeLocationTz: block.sleep_start_time_location_tz ?? undefined,
            sleepEndTimeLocationTz: block.sleep_end_time_location_tz ?? undefined,
            sleepStartDay: block.sleep_start_day ?? undefined,
            sleepStartHour: block.sleep_start_hour ?? undefined,
            sleepEndDay: block.sleep_end_day ?? undefined,
            sleepEndHour: block.sleep_end_hour ?? undefined,
          })),
          totalSleepHours: restDay.total_sleep_hours,
          effectiveSleepHours: restDay.effective_sleep_hours,
          sleepEfficiency: restDay.sleep_efficiency,
          strategyType: restDay.strategy_type,
          confidence: restDay.confidence,
          explanation: restDay.explanation,
          confidenceBasis: restDay.confidence_basis,
          qualityFactors: restDay.quality_factors,
          references: restDay.references,
        })),
        bodyClockTimeline: result.body_clock_timeline?.map(entry => ({
          timestampUtc: entry.timestamp_utc,
          phaseShiftHours: entry.phase_shift_hours,
          referenceTimezone: entry.reference_timezone,
        })),
        duties: result.duties.map(duty => {
          const segmentPerformances = calculateSegmentPerformances(duty);
          const sleep = duty.sleep_quality ?? duty.sleep_estimate;
          const sleepEnvironment = duty.sleep_environment ?? sleep?.sleep_environment;
          const sleepQuality = duty.sleep_quality_label ?? sleep?.sleep_quality_label;

          return {
            dutyId: duty.duty_id,
            date: parseISO(duty.date),
            dateString: duty.date,
            dayOfWeek: format(parseISO(duty.date), 'EEE'),
            reportTimeUtc: duty.report_time_utc,
            reportTimeLocal: duty.report_time_local,
            releaseTimeLocal: duty.release_time_local,
            dutyHours: duty.duty_hours,
            blockHours: duty.segments.reduce((sum, seg) => sum + computeSegmentBlockHours(seg), 0),
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
            circadianPhaseShiftValue: duty.circadian_phase_shift ?? undefined,
            sleepEnvironment,
            sleepQuality,
            sleepEstimate: sleep ? (() => {
              const sleepBlocks = (sleep as unknown as Record<string, unknown>).sleep_blocks as Array<{ sleep_start_iso?: string; sleep_end_iso?: string }> | undefined;
              const firstBlock = sleepBlocks?.[0];
              const sleepStartIso = sleep.sleep_start_iso ?? firstBlock?.sleep_start_iso;
              const sleepEndIso = sleep.sleep_end_iso ?? firstBlock?.sleep_end_iso;
              
              const sleepRecord = sleep as unknown as Record<string, unknown>;
              let sleepStartDay = sleepRecord.sleep_start_day as number | undefined;
              let sleepStartHour = sleepRecord.sleep_start_hour as number | undefined;
              let sleepEndDay = sleepRecord.sleep_end_day as number | undefined;
              let sleepEndHour = sleepRecord.sleep_end_hour as number | undefined;
              
              // Home base timezone fields (for chronogram positioning)
              const sleepStartDayHomeTz = sleepRecord.sleep_start_day_home_tz as number | undefined;
              const sleepStartHourHomeTz = sleepRecord.sleep_start_hour_home_tz as number | undefined;
              const sleepEndDayHomeTz = sleepRecord.sleep_end_day_home_tz as number | undefined;
              const sleepEndHourHomeTz = sleepRecord.sleep_end_hour_home_tz as number | undefined;
              const sleepStartTimeHomeTz = sleepRecord.sleep_start_time_home_tz as string | undefined;
              const sleepEndTimeHomeTz = sleepRecord.sleep_end_time_home_tz as string | undefined;
              const locationTimezone = sleepRecord.location_timezone as string | undefined;
              const sleepEnvironment2 = sleepRecord.environment as 'home' | 'hotel' | 'layover' | undefined;
              
              const parseIsoToDayHour = (iso: string | undefined): { day: number; hour: number } | null => {
                if (!iso) return null;
                const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
                if (m) return { day: Number(m[3]), hour: Number(m[4]) + Number(m[5]) / 60 };
                return null;
              };
              
              if (sleepStartDay == null && sleepStartIso) {
                const parsed = parseIsoToDayHour(sleepStartIso as string);
                if (parsed) { sleepStartDay = parsed.day; sleepStartHour = parsed.hour; }
              }
              if (sleepEndDay == null && sleepEndIso) {
                const parsed = parseIsoToDayHour(sleepEndIso as string);
                if (parsed) { sleepEndDay = parsed.day; sleepEndHour = parsed.hour; }
              }
              
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
                sleepStartDayHomeTz,
                sleepStartHourHomeTz,
                sleepEndDayHomeTz,
                sleepEndHourHomeTz,
                sleepStartTimeHomeTz,
                sleepEndTimeHomeTz,
                locationTimezone,
                environment: sleepEnvironment2,
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
              departureTimeAirportLocal: seg.departure_time_airport_local,
              arrivalTimeAirportLocal: seg.arrival_time_airport_local,
              departureTimezone: seg.departure_timezone,
              arrivalTimezone: seg.arrival_timezone,
              departureUtcOffset: seg.departure_utc_offset,
              arrivalUtcOffset: seg.arrival_utc_offset,
            })),
          };
        }),
        homeBaseTimezone: result.home_base_timezone ?? undefined,
      });
      
      toast.success('Analysis complete!');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      const errMsg = (error as Error).message;
      console.error('[Analysis] API call failed:', errMsg, error);
      toast.error('Analysis failed: ' + errMsg);
      // Do NOT fall back to mock data — let the user see the failure
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDutySelect = (duty: DutyAnalysis) => {
    setSelectedDuty(duty);
    setDrawerOpen(true);
  };

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <AuroraBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header 
          theme={settings.theme} 
          onThemeChange={(theme) => handleSettingsChange({ theme })}
          onMenuToggle={() => setSidebarOpen(true)}
          showMenuButton={true}
        />
        
        {/* 4-Tab Navigation */}
        <Tabs defaultValue="analysis" className="flex flex-1 flex-col">
          <div className="border-b border-border/30 glass-subtle overflow-x-auto">
            <div className="px-2 md:px-6">
              <TabsList className="h-10 md:h-12 w-full justify-start gap-0 md:gap-1 rounded-none border-0 bg-transparent p-0">
                <TabsTrigger 
                  value="analysis" 
                  className="rounded-none border-b-2 border-transparent px-3 md:px-5 py-2 md:py-3 text-xs md:text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Analysis
                </TabsTrigger>
                <TabsTrigger 
                  value="insights" 
                  className="rounded-none border-b-2 border-transparent px-3 md:px-5 py-2 md:py-3 text-xs md:text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Insights
                </TabsTrigger>
                <TabsTrigger 
                  value="learn" 
                  className="rounded-none border-b-2 border-transparent px-3 md:px-5 py-2 md:py-3 text-xs md:text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Learn
                </TabsTrigger>
                <TabsTrigger 
                  value="about" 
                  className="rounded-none border-b-2 border-transparent px-3 md:px-5 py-2 md:py-3 text-xs md:text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  About
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="analysis" className="flex-1 mt-0">
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
              sidebarOpen={sidebarOpen}
              onSidebarOpenChange={setSidebarOpen}
            />
          </TabsContent>

          <TabsContent value="insights" className="flex-1 mt-0">
            <InsightsContent 
              analysisResults={analysisResults} 
              settings={settings} 
            />
          </TabsContent>

          <TabsContent value="learn" className="flex-1 mt-0">
            <LearnPage />
          </TabsContent>

          <TabsContent value="about" className="flex-1 mt-0">
            <AboutPage />
          </TabsContent>
        </Tabs>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
