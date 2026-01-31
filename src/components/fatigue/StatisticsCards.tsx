import { AlertTriangle, Plane, AlertCircle, Clock, Timer, Zap, Moon, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DutyStatistics } from '@/types/fatigue';

interface StatisticsCardsProps {
  statistics: DutyStatistics;
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  // Format hours as HH:MM, handling edge cases like negative or invalid values
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

  const getPerformanceBg = (score: number): string => {
    if (score >= 80) return 'bg-success/10';
    if (score >= 70) return 'bg-primary/10';
    if (score >= 60) return 'bg-warning/10';
    return 'bg-critical/10';
  };

  const stats = [
    {
      label: 'Total Duties',
      value: statistics.totalDuties,
      icon: Plane,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Sectors',
      value: statistics.totalSectors,
      icon: Plane,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Duty Hours',
      value: formatHoursMinutes(statistics.totalDutyHours),
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Block Hours',
      value: formatHoursMinutes(statistics.totalBlockHours),
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Avg Sleep/Night',
      value: `${statistics.avgSleepPerNight.toFixed(1)}h`,
      icon: Moon,
      color: statistics.avgSleepPerNight >= 7 ? 'text-success' : statistics.avgSleepPerNight >= 6 ? 'text-warning' : 'text-critical',
      bgColor: statistics.avgSleepPerNight >= 7 ? 'bg-success/10' : statistics.avgSleepPerNight >= 6 ? 'bg-warning/10' : 'bg-critical/10',
    },
    {
      label: 'Pinch Events',
      value: statistics.totalPinchEvents,
      icon: Zap,
      color: statistics.totalPinchEvents === 0 ? 'text-success' : statistics.totalPinchEvents <= 3 ? 'text-warning' : 'text-critical',
      bgColor: statistics.totalPinchEvents === 0 ? 'bg-success/10' : statistics.totalPinchEvents <= 3 ? 'bg-warning/10' : 'bg-critical/10',
    },
    {
      label: 'Worst Performance',
      value: `${Math.round(statistics.worstPerformance)}%`,
      icon: TrendingDown,
      color: getPerformanceColor(statistics.worstPerformance),
      bgColor: getPerformanceBg(statistics.worstPerformance),
    },
    {
      label: 'High Risk Duties',
      value: statistics.highRiskDuties,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Critical Risk',
      value: statistics.criticalRiskDuties,
      icon: AlertCircle,
      color: 'text-critical',
      bgColor: 'bg-critical/10',
    },
    {
      label: 'Max Sleep Debt',
      value: `${statistics.maxSleepDebt.toFixed(1)}h`,
      icon: Clock,
      color: 'text-critical',
      bgColor: 'bg-critical/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-10">
      {stats.map((stat, index) => (
        <Card 
          key={stat.label} 
          variant="glass" 
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
