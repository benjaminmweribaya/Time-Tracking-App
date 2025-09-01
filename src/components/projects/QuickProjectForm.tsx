import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface QuickProjectFormProps {
  onProjectCreated?: () => void;
}

const QuickProjectForm = ({ onProjectCreated }: QuickProjectFormProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const { error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || null,
        created_by: user?.id,
      });

    if (error) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Project created",
        description: `${name} has been created successfully.`,
      });
      
      // Reset form
      e.currentTarget.reset();
      setIsExpanded(false);
      onProjectCreated?.();
    }

    setIsLoading(false);
  };

  if (!isExpanded) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={() => setIsExpanded(true)} 
            variant="outline" 
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              name="name"
              placeholder="Project name"
              required
              maxLength={100}
            />
          </div>
          <div>
            <Textarea
              name="description"
              placeholder="Project description (optional)"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuickProjectForm;