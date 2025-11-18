import DashboardWelcome from './components/dashboard-welcome';

export default function DashboardRootPage() {
  return (
    <div className="flex flex-col gap-6">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
            Welcome! Select a section to get started.
            </p>
        </div>
        <DashboardWelcome />
    </div>
  );
}
