import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Play, Pause, Square } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
}

interface TimeEntry {
  id: string;
  start_time: string;
  is_running: boolean;
  description?: string;
  project_id: string;
  task_id?: string;
}

const TimeTracker = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [description, setDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  // Load projects and active time entry
  useEffect(() => {
    if (user) {
      loadProjects();
      loadActiveTimeEntry();
    }
  }, [user]);

  // Load tasks when project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject);
    }
  }, [selectedProject]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeEntry && activeEntry.is_running) {
      interval = setInterval(() => {
        const startTime = new Date(activeEntry.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false });

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

  const loadTasks = async (projectId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, project_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTasks(data || []);
    }
  };

  const loadActiveTimeEntry = async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_running', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast({
        title: "Error loading active timer",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setActiveEntry(data);
      setSelectedProject(data.project_id);
      setSelectedTask(data.task_id || '');
      setDescription(data.description || '');
    }
  };

  const startTimer = async () => {
    if (!selectedProject) {
      toast({
        title: "Project required",
        description: "Please select a project to start tracking time.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user?.id,
        project_id: selectedProject,
        task_id: selectedTask || null,
        description: description,
        start_time: new Date().toISOString(),
        is_running: true,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error starting timer",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setActiveEntry(data);
      toast({
        title: "Timer started",
        description: "Time tracking has begun!",
      });
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;

    const { error } = await supabase
      .from('time_entries')
      .update({
        is_running: false,
        end_time: new Date().toISOString(),
        description: description,
      })
      .eq('id', activeEntry.id);

    if (error) {
      toast({
        title: "Error stopping timer",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setActiveEntry(null);
      setElapsedTime(0);
      setDescription('');
      toast({
        title: "Timer stopped",
        description: "Time entry saved successfully!",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Time Tracker
          <div className="text-2xl font-mono">
            {formatTime(elapsedTime)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project</label>
            <Select 
              value={selectedProject} 
              onValueChange={setSelectedProject}
              disabled={!!activeEntry}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Task (Optional)</label>
            <Select 
              value={selectedTask} 
              onValueChange={setSelectedTask}
              disabled={!!activeEntry || !selectedProject}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you working on?"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          {!activeEntry ? (
            <Button onClick={startTimer} className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Start Timer
            </Button>
          ) : (
            <Button onClick={stopTimer} variant="destructive" className="flex-1">
              <Square className="mr-2 h-4 w-4" />
              Stop Timer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeTracker;