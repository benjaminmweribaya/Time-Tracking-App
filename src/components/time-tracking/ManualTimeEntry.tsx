import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Clock, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
}

const ManualTimeEntry = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState('');
  const [entryMode, setEntryMode] = useState<'time-range' | 'duration'>('time-range');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject);
    }
  }, [selectedProject]);

  // Calculate duration when start/end times change
  useEffect(() => {
    if (entryMode === 'time-range' && startTime && endTime) {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        setDuration(diffHours.toFixed(2));
      }
    }
  }, [startTime, endTime, date, entryMode]);

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
      setSelectedTask(''); // Reset task selection when project changes
    }
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      toast({
        title: "Project required",
        description: "Please select a project for this time entry.",
        variant: "destructive",
      });
      return;
    }

    const durationMinutes = parseFloat(duration) * 60;
    if (!durationMinutes || durationMinutes <= 0) {
      toast({
        title: "Invalid duration",
        description: "Please enter a valid duration.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const startDateTime = entryMode === 'time-range' 
      ? new Date(`${date}T${startTime}`)
      : new Date(`${date}T09:00:00`); // Default start time for duration mode

    const endDateTime = entryMode === 'time-range'
      ? new Date(`${date}T${endTime}`)
      : new Date(startDateTime.getTime() + (durationMinutes * 60 * 1000));

    const { error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user?.id,
        project_id: selectedProject,
        task_id: selectedTask || null,
        description: description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_minutes: Math.round(durationMinutes),
        is_running: false,
      });

    if (error) {
      toast({
        title: "Error adding time entry",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Time entry added",
        description: `Added ${duration} hours to ${projects.find(p => p.id === selectedProject)?.name}`,
      });
      
      // Reset form
      setDescription('');
      setDuration('');
      setStartTime('09:00');
      setEndTime('10:00');
      setSelectedTask('');
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Add Manual Time Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="project">Project *</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
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
            <Label htmlFor="task">Task (Optional)</Label>
            <Select 
              value={selectedTask} 
              onValueChange={setSelectedTask}
              disabled={!selectedProject}
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
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Time Entry Mode</Label>
          <div className="flex gap-2 mt-2">
            <Button 
              variant={entryMode === 'time-range' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setEntryMode('time-range')}
            >
              Start/End Time
            </Button>
            <Button 
              variant={entryMode === 'duration' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setEntryMode('duration')}
            >
              Duration Only
            </Button>
          </div>
        </div>

        {entryMode === 'time-range' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              placeholder="e.g., 2.5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        )}

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            rows={3}
          />
        </div>

        {duration && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Duration:</strong> {duration} hours
              {entryMode === 'time-range' && (
                <span className="ml-2 text-muted-foreground">
                  ({startTime} - {endTime})
                </span>
              )}
            </p>
          </div>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={loading || !selectedProject || !duration}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {loading ? 'Adding...' : 'Add Time Entry'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ManualTimeEntry;