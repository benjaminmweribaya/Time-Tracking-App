import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import DashboardStats from '@/components/dashboard/DashboardStats';
import TimeTracker from '@/components/time-tracking/TimeTracker';
import QuickProjectForm from '@/components/projects/QuickProjectForm';
import ManualTimeEntry from '@/components/time-tracking/ManualTimeEntry';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Track your time and manage your projects efficiently.</p>
        </div>

        <DashboardStats />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TimeTracker />
          <QuickProjectForm />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          <ManualTimeEntry />
        </div>
      </main>
    </div>
  );
};

export default Index;
