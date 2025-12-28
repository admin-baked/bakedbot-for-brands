import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe } from "lucide-react";
import { researchService } from "@/server/services/research-service";
import { requireUser } from "@/server/auth/auth";
import { ResearchTaskList } from "./components/research-task-list";

export default async function ResearchPage() {
  const user = await requireUser();
  const tasks = await researchService.getTasksByBrand(user.brandId || 'demo');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smokey Deep Research</h1>
          <p className="text-muted-foreground">Comprehensive web analysis and market intelligence reports.</p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Globe className="h-4 w-4" />
          New Research Task
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* New Task Card */}
        <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer group">
          <CardContent className="flex flex-col items-center justify-center h-[200px] text-center p-6">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Start New Research</h3>
            <p className="text-sm text-muted-foreground">
              Task the AI with a complex query like "Analyze competitor pricing in Thailand"
            </p>
          </CardContent>
        </Card>

        {/* Task List - Client Component to avoid hydration issues with dates */}
        <ResearchTaskList tasks={tasks} />
      </div>
    </div>
  );
}
