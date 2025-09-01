import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Target, Calendar, TrendingUp } from 'lucide-react';

interface Stats {
  todayHours: number;
  weekHours: number;
  activeProjects: number;
  completedTasks: number;
}

const DashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    todayHours: 0,
    weekHours: 0,
    activeProjects: 0,
    completedTasks: 0,
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Today's hours
    const { data: todayEntries } = await supabase
      .from('time_entries')
      .select('duration_minutes')
      .eq('user_id', user?.id)
      .gte('start_time', startOfDay.toISOString())
      .not('duration_minutes', 'is', null);

    // Week's hours
    const { data: weekEntries } = await supabase
      .from('time_entries')
      .select('duration_minutes')
      .eq('user_id', user?.id)
      .gte('start_time', startOfWeek.toISOString())
      .not('duration_minutes', 'is', null);

    // Active projects count
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .or(`created_by.eq.${user?.id},project_members.user_id.eq.${user?.id}`);

    // Completed tasks this week
    const { count: completedTasksCount } = await supabase
      .from('tasks')
      .select('*, projects!inner(*)', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', startOfWeek.toISOString())
      .or(`projects.created_by.eq.${user?.id},projects.project_members.user_id.eq.${user?.id}`);

    const todayHours = (todayEntries?.reduce((acc, entry) => acc + (entry.duration_minutes || 0), 0) || 0) / 60;
    const weekHours = (weekEntries?.reduce((acc, entry) => acc + (entry.duration_minutes || 0), 0) || 0) / 60;

    setStats({
      todayHours,
      weekHours,
      activeProjects: projectCount || 0,
      completedTasks: completedTasksCount || 0,
    });
  };

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Hours</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHours(stats.todayHours)}</div>
          <p className="text-xs text-muted-foreground">Time tracked today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHours(stats.weekHours)}</div>
          <p className="text-xs text-muted-foreground">Weekly total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeProjects}</div>
          <p className="text-xs text-muted-foreground">Projects in progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks Done</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedTasks}</div>
          <p className="text-xs text-muted-foreground">Completed this week</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;