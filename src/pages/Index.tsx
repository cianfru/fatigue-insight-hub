import { useState } from 'react';
import { Play, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/fatigue/Header';
import { Footer } from '@/components/fatigue/Footer';
import { SettingsSidebar } from '@/components/fatigue/SettingsSidebar';
import { FileUpload } from '@/components/fatigue/FileUpload';
import { StatisticsCards } from '@/components/fatigue/StatisticsCards';
import { Chronogram } from '@/components/fatigue/Chronogram';
import { DutyDetails } from '@/components/fatigue/DutyDetails';
import { PerformanceTimeline } from '@/components/fatigue/PerformanceTimeline';
import { RouteNetwork } from '@/components/fatigue/RouteNetwork';
import { ExportOptions } from '@/components/fatigue/ExportOptions';
import { PilotSettings, UploadedFile, AnalysisResults, DutyAnalysis } from '@/types/fatigue';
import { mockAnalysisResults } from '@/data/mockAnalysisData';
import { useTheme } from '@/hooks/useTheme';
import { Badge } from '@/components/ui/badge';

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
  const [selectedDuty, setSelectedDuty] = useState<DutyAnalysis | null>(mockAnalysisResults.duties[4]); // Pre-select the critical duty
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header theme={settings.theme} onThemeChange={(theme) => handleSettingsChange({ theme })} />
      
      <div className="flex flex-1">
        {/* Settings Sidebar */}
        <SettingsSidebar settings={settings} onSettingsChange={handleSettingsChange} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* File Upload */}
            <FileUpload
              onFileUpload={handleFileUpload}
              uploadedFile={uploadedFile}
              onRemoveFile={handleRemoveFile}
            />

            {/* Run Analysis Button */}
            {uploadedFile && (
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-primary">🚀</span>
                    Step 2: Run Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="glow"
                    size="lg"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isAnalyzing ? 'Analyzing...' : 'Run Fatigue Analysis'}
                  </Button>
                  {analysisResults && (
                    <div className="mt-4 flex items-center gap-2 text-success">
                      <Badge variant="success">✅ Analysis complete</Badge>
                      <span className="text-sm">- results shown below</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            {analysisResults && (
              <div className="space-y-6 animate-fade-in">
                {/* Results Header */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-primary">📊</span>
                      Step 3: Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Summary Statistics</h4>
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

                {/* Chronogram */}
                <Chronogram
                  duties={analysisResults.duties}
                  statistics={analysisResults.statistics}
                  month={settings.selectedMonth}
                  pilotId={settings.pilotId}
                  onDutySelect={setSelectedDuty}
                  selectedDuty={selectedDuty}
                />

                {/* Selected Duty Details */}
                {selectedDuty && <DutyDetails duty={selectedDuty} />}

                {/* Performance Timeline */}
                <PerformanceTimeline duties={analysisResults.duties} month={settings.selectedMonth} />

                {/* Route Network */}
                <RouteNetwork duties={analysisResults.duties} homeBase={settings.homeBase} />

                {/* Export Options */}
                <ExportOptions />
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
