import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, Download, Filter } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface TimeEntry {
  id: string;
  project_id: string;
  task_id?: string;
  duration_minutes: number;
  start_time: string;
  description?: string;
  projects: { name: string; color: string };
  tasks?: { title: string };
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ChartData {
  name: string;
  hours: number;
  color: string;
}

const Reports = () => {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProjects();
      loadTimeEntries();
    }
  }, [user, selectedProject, dateRange]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, color')
      .order('name');

    if (error) {
      toast({
        title: "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProjects(data || []);
    }
  };

  const loadTimeEntries = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setLoading(true);
    let query = supabase
      .from('time_entries')
      .select(`
        id,
        project_id,
        task_id,
        duration_minutes,
        start_time,
        description,
        projects (name, color),
        tasks (title)
      `)
      .eq('user_id', user?.id)
      .gte('start_time', dateRange.from.toISOString())
      .lte('start_time', dateRange.to.toISOString())
      .not('duration_minutes', 'is', null)
      .order('start_time', { ascending: false });

    if (selectedProject !== 'all') {
      query = query.eq('project_id', selectedProject);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error loading time entries",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTimeEntries(data || []);
    }
    setLoading(false);
  };

  const getProjectChartData = (): ChartData[] => {
    const projectTotals = timeEntries.reduce((acc, entry) => {
      const projectName = entry.projects.name;
      const hours = (entry.duration_minutes || 0) / 60;
      
      if (!acc[projectName]) {
        acc[projectName] = {
          name: projectName,
          hours: 0,
          color: entry.projects.color || '#3B82F6',
        };
      }
      acc[projectName].hours += hours;
      return acc;
    }, {} as Record<string, ChartData>);

    return Object.values(projectTotals).sort((a, b) => b.hours - a.hours);
  };

  const getDailyChartData = (): ChartData[] => {
    const dailyTotals = timeEntries.reduce((acc, entry) => {
      const date = format(new Date(entry.start_time), 'MMM dd');
      const hours = (entry.duration_minutes || 0) / 60;
      
      if (!acc[date]) {
        acc[date] = {
          name: date,
          hours: 0,
          color: 'hsl(var(--primary))',
        };
      }
      acc[date].hours += hours;
      return acc;
    }, {} as Record<string, ChartData>);

    return Object.values(dailyTotals);
  };

  const getTotalHours = () => {
    return timeEntries.reduce((total, entry) => total + (entry.duration_minutes || 0) / 60, 0);
  };

  const setQuickRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'thisWeek':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'lastWeek':
        setDateRange({ 
          from: startOfWeek(addDays(now, -7)), 
          to: endOfWeek(addDays(now, -7)) 
        });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        setDateRange({ 
          from: startOfMonth(addDays(now, -30)), 
          to: endOfMonth(addDays(now, -30)) 
        });
        break;
    }
  };

  const exportToCsv = () => {
    const csvData = timeEntries.map(entry => ({
      Date: format(new Date(entry.start_time), 'yyyy-MM-dd'),
      Project: entry.projects.name,
      Task: entry.tasks?.title || 'No task',
      Duration: `${((entry.duration_minutes || 0) / 60).toFixed(2)} hours`,
      Description: entry.description || '',
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const chartConfig = {
    hours: {
      label: "Hours",
      color: "hsl(var(--primary))",
    },
  };

  const projectData = getProjectChartData();
  const dailyData = getDailyChartData();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Track your time and productivity patterns</p>
          </div>
          <Button onClick={exportToCsv} disabled={timeEntries.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Quick Ranges</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuickRange('thisWeek')}>
                    This Week
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickRange('thisMonth')}>
                    This Month
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{getTotalHours().toFixed(1)}h</div>
              <p className="text-muted-foreground">Total Hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{timeEntries.length}</div>
              <p className="text-muted-foreground">Time Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{projectData.length}</div>
              <p className="text-muted-foreground">Projects Worked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {getTotalHours() > 0 ? (getTotalHours() / Math.max(1, dailyData.length)).toFixed(1) : 0}h
              </div>
              <p className="text-muted-foreground">Daily Average</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Daily Time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectData}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, hours }) => `${name}: ${hours.toFixed(1)}h`}
                    >
                      {projectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : timeEntries.length === 0 ? (
              <p className="text-center text-muted-foreground p-8">No time entries found for the selected filters.</p>
            ) : (
              <div className="space-y-2">
                {timeEntries.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.projects.color }}
                      />
                      <div>
                        <p className="font-medium">{entry.projects.name}</p>
                        {entry.tasks && (
                          <p className="text-sm text-muted-foreground">{entry.tasks.title}</p>
                        )}
                        {entry.description && (
                          <p className="text-sm text-muted-foreground">{entry.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{((entry.duration_minutes || 0) / 60).toFixed(1)}h</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.start_time), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;