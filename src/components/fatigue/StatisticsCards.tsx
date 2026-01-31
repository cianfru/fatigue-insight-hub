import { AlertTriangle, Plane, AlertCircle, Clock, Timer, Zap, Moon, TrendingDown } from 'lucide-react';
import { DutyStatistics } from '@/types/fatigue';

interface StatisticsCardsProps {
  statistics: DutyStatistics;
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  // Format hours as HH:MM
  const formatHoursMinutes = (hours: number): string => {
    if (!Number.isFinite(hours) || hours < 0) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  // Get performance color based on score
  const getPerformanceColor = (score: number): string => {
    if (score >= 80) return 'text-success';
    if (score >= 70) return 'text-primary';
    if (score >= 60) return 'text-warning';
    return 'text-critical';
  };

  // Sleep quality indicator
  const getSleepColor = (hours: number): string => {
    if (hours >= 7) return 'text-success';
    if (hours >= 6) return 'text-warning';
    return 'text-critical';
  };

  return (
    <div className="space-y-4">
      {/* Primary Stats Row - Flight Activity */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Duties"
          value={statistics.totalDuties.toString()}
          icon={<Plane className="h-4 w-4" />}
          variant="neutral"
        />
        <StatCard
          label="Total Sectors"
          value={statistics.totalSectors.toString()}
          icon={<Plane className="h-4 w-4" />}
          variant="neutral"
        />
        <StatCard
          label="Duty Hours"
          value={formatHoursMinutes(statistics.totalDutyHours)}
          icon={<Timer className="h-4 w-4" />}
          variant="neutral"
        />
        <StatCard
          label="Block Hours"
          value={formatHoursMinutes(statistics.totalBlockHours)}
          icon={<Timer className="h-4 w-4" />}
          variant="neutral"
        />
      </div>

      {/* Secondary Stats Row - Fatigue Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Avg Sleep"
          value={`${statistics.avgSleepPerNight.toFixed(1)}h`}
          icon={<Moon className="h-4 w-4" />}
          variant={statistics.avgSleepPerNight >= 7 ? 'success' : statistics.avgSleepPerNight >= 6 ? 'warning' : 'critical'}
          subtitle="per night"
        />
        <StatCard
          label="Pinch Events"
          value={statistics.totalPinchEvents.toString()}
          icon={<Zap className="h-4 w-4" />}
          variant={statistics.totalPinchEvents === 0 ? 'success' : statistics.totalPinchEvents <= 5 ? 'warning' : 'critical'}
          subtitle="fatigue peaks"
        />
        <StatCard
          label="Worst Score"
          value={`${Math.round(statistics.worstPerformance)}%`}
          icon={<TrendingDown className="h-4 w-4" />}
          variant={statistics.worstPerformance >= 70 ? 'success' : statistics.worstPerformance >= 60 ? 'warning' : 'critical'}
          subtitle="min performance"
        />
        <StatCard
          label="High Risk"
          value={statistics.highRiskDuties.toString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={statistics.highRiskDuties === 0 ? 'success' : 'warning'}
          subtitle="duties"
        />
        <StatCard
          label="Critical Risk"
          value={statistics.criticalRiskDuties.toString()}
          icon={<AlertCircle className="h-4 w-4" />}
          variant={statistics.criticalRiskDuties === 0 ? 'success' : 'critical'}
          subtitle="duties"
        />
        <StatCard
          label="Sleep Debt"
          value={`${statistics.maxSleepDebt.toFixed(1)}h`}
          icon={<Clock className="h-4 w-4" />}
          variant={statistics.maxSleepDebt <= 2 ? 'success' : statistics.maxSleepDebt <= 4 ? 'warning' : 'critical'}
          subtitle="maximum"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant: 'neutral' | 'success' | 'warning' | 'critical';
  subtitle?: string;
}

function StatCard({ label, value, icon, variant, subtitle }: StatCardProps) {
  const variantStyles = {
    neutral: {
      text: 'text-foreground',
      icon: 'text-muted-foreground',
      bg: 'bg-muted/30',
    },
    success: {
      text: 'text-success',
      icon: 'text-success',
      bg: 'bg-success/10',
    },
    warning: {
      text: 'text-warning',
      icon: 'text-warning',
      bg: 'bg-warning/10',
    },
    critical: {
      text: 'text-critical',
      icon: 'text-critical',
      bg: 'bg-critical/10',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-border hover:bg-card/80">
      {/* Icon Badge */}
      <div className={`absolute right-3 top-3 rounded-full p-2 ${styles.bg}`}>
        <span className={styles.icon}>{icon}</span>
      </div>
      
      {/* Content */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold tracking-tight ${styles.text}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
