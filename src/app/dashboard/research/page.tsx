import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe, FileText, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { researchService } from "@/server/services/research-service";
import { requireUser } from "@/server/auth/auth";
import { ResearchTask } from "@/types/research";
import { formatDistanceToNow } from "date-fns";

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

        {/* Task List */}
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="truncate pr-2" title={task.query}>{task.query}</span>
                <StatusBadge status={task.status} />
              </CardTitle>
              <CardDescription className="text-xs">
                {formatDistanceToNow(task.createdAt, { addSuffix: true })} • Depth: {task.depth}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {task.status === 'processing' ? (
                <div className="space-y-2">
                   <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[60%] animate-pulse" />
                   </div>
                   <p className="text-xs text-muted-foreground text-center animate-pulse">
                      Analyzing sources...
                   </p>
                </div>
              ) : task.status === 'completed' ? (
                 <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    Research complete. {task.resultReportId ? 'Report generated.' : 'View details.'}
                 </p>
              ) : (
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                   Status: {task.status}
                </p>
              )}

              <Button 
                variant={task.status === 'completed' ? 'outline' : 'ghost'} 
                size="sm" 
                className="w-full gap-1"
                disabled={task.status !== 'completed'}
              >
                {task.status === 'completed' ? <><FileText className="h-3 w-3" /> View Report</> : 'Processing...'}
              </Button>
            </CardContent>
          </Card>
        ))}

        {tasks.length === 0 && (
           <div className="col-span-full py-10 text-center text-muted-foreground">
              No research tasks found. Start one above!
           </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ResearchTask['status'] }) {
    switch (status) {
        case 'completed':
            return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Done</span>;
        case 'processing':
            return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="h-3 w-3 animate-spin" /> Running</span>;
        case 'failed':
            return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Failed</span>;
        default:
             return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{status}</span>;
    }
}
