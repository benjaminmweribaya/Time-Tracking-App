-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed');
CREATE TYPE public.time_entry_category AS ENUM ('work', 'study', 'break', 'custom');
CREATE TYPE public.user_role AS ENUM ('admin', 'member', 'viewer');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  deadline TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  category time_entry_category DEFAULT 'work',
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  is_running BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create project_members table
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for projects
CREATE POLICY "Users can view projects they're members of" ON public.projects FOR SELECT USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Project creators and admins can update projects" ON public.projects FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Project creators can delete projects" ON public.projects FOR DELETE USING (created_by = auth.uid());

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks from their projects" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
  ))
);
CREATE POLICY "Project members can create tasks" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
  ))
);
CREATE POLICY "Project members can update tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
  ))
);
CREATE POLICY "Project members can delete tasks" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
  ))
);

-- Create RLS policies for time_entries
CREATE POLICY "Users can view their own time entries" ON public.time_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own time entries" ON public.time_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own time entries" ON public.time_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own time entries" ON public.time_entries FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for teams
CREATE POLICY "Users can view teams they're members of" ON public.teams FOR SELECT USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
);
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team creators and admins can update teams" ON public.teams FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Team creators can delete teams" ON public.teams FOR DELETE USING (created_by = auth.uid());

-- Create RLS policies for team_members
CREATE POLICY "Users can view team members of their teams" ON public.team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid())
  ))
);
CREATE POLICY "Team admins can manage team members" ON public.team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid() AND role = 'admin')
  ))
);

-- Create RLS policies for project_members
CREATE POLICY "Users can view project members of their projects" ON public.project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_members.project_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid())
  ))
);
CREATE POLICY "Project admins can manage project members" ON public.project_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin')
  ))
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate duration when time entry is stopped
CREATE OR REPLACE FUNCTION public.calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- If end_time is set and start_time exists, calculate duration
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    NEW.is_running = false;
  END IF;
  
  -- If is_running is set to false but end_time is null, set end_time to now
  IF NEW.is_running = false AND OLD.is_running = true AND NEW.end_time IS NULL THEN
    NEW.end_time = now();
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for time entry duration calculation
CREATE TRIGGER calculate_duration_on_time_entry_update
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_time_entry_duration();

CREATE TRIGGER calculate_duration_on_time_entry_insert
  BEFORE INSERT ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_time_entry_duration();