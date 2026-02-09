import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingsSidebar } from '@/components/fatigue/SettingsSidebar';
import { Chronogram } from '@/components/fatigue/Chronogram';
import { PinchEventAlerts } from '@/components/fatigue/PinchEventAlerts';
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
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
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
  sidebarOpen,
  onSidebarOpenChange,
}: DashboardContentProps) {
  return (
    <div className="flex flex-1 relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => onSidebarOpenChange(false)}
        />
      )}
      
      {/* Settings Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 md:hidden z-10"
          onClick={() => onSidebarOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="h-full overflow-y-auto glass-strong border-r border-border/30">
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
        </div>
      </div>

      {/* Main Content - Analysis focused */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
          {analysisResults && (
            <div className="space-y-4 md:space-y-6 animate-fade-in">
              {/* Pinch Event Alerts */}
              <PinchEventAlerts duties={analysisResults.duties} />

              {/* Monthly Chronogram */}
              <Chronogram
                duties={analysisResults.duties}
                statistics={analysisResults.statistics}
                month={analysisResults.month}
                pilotId={settings.pilotId}
                onDutySelect={onDutySelect}
                selectedDuty={selectedDuty}
                restDaysSleep={analysisResults.restDaysSleep}
              />
            </div>
          )}

          {!analysisResults && uploadedFile && (
            <Card variant="glass" className="p-8 md:p-12 text-center">
              <div className="space-y-4">
                <span className="text-5xl md:text-6xl">📊</span>
                <h3 className="text-lg md:text-xl font-semibold">Ready to Analyze</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Click "Run Analysis" in the sidebar to generate your fatigue analysis.
                </p>
              </div>
            </Card>
          )}

          {!uploadedFile && (
            <Card variant="glass" className="p-8 md:p-12 text-center">
              <div className="space-y-4">
                <span className="text-5xl md:text-6xl">📄</span>
                <h3 className="text-lg md:text-xl font-semibold">No Roster Uploaded</h3>
                <p className="text-sm md:text-base text-muted-foreground">
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
