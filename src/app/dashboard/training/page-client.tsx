/**
 * Training Dashboard - Client Component
 *
 * Interactive UI for the training platform.
 * Shows curriculum, progress, and challenge list.
 */

'use client';

import type { TrainingProgram, UserTrainingProgress } from '@/types/training';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface TrainingPageClientProps {
    program: TrainingProgram;
    progress: UserTrainingProgress;
    userId: string;
}

export function TrainingPageClient({ program, progress }: TrainingPageClientProps) {
    const completionRate = (progress.completedChallenges.length / calculateTotalChallenges(program)) * 100;

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{program.name}</h1>
                <p className="text-muted-foreground mt-2">{program.description}</p>
            </div>

            {/* Progress Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Progress</CardTitle>
                    <CardDescription>
                        Week {progress.currentWeek} of {program.durationWeeks}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span>Overall Completion</span>
                            <span className="font-medium">{Math.round(completionRate)}%</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div>
                            <div className="text-2xl font-bold">{progress.completedChallenges.length}</div>
                            <div className="text-xs text-muted-foreground">Challenges Completed</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{progress.totalSubmissions}</div>
                            <div className="text-xs text-muted-foreground">Total Submissions</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {progress.acceptedSubmissions > 0
                                    ? Math.round((progress.acceptedSubmissions / progress.totalSubmissions) * 100)
                                    : 0}
                                %
                            </div>
                            <div className="text-xs text-muted-foreground">Approval Rate</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Curriculum */}
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Curriculum</h2>

                <div className="grid gap-4">
                    {program.curriculum.map((week) => {
                        const isCurrentWeek = week.weekNumber === progress.currentWeek;
                        const isPastWeek = week.weekNumber < progress.currentWeek;
                        const weekChallenges = week.challengeIds.length;
                        const weekCompleted = week.challengeIds.filter((id) =>
                            progress.completedChallenges.includes(id)
                        ).length;

                        return (
                            <Card
                                key={week.weekNumber}
                                className={isCurrentWeek ? 'border-primary' : isPastWeek ? 'opacity-75' : ''}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                {isPastWeek && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                                {isCurrentWeek && <Clock className="h-5 w-5 text-primary" />}
                                                {!isPastWeek && !isCurrentWeek && <Circle className="h-5 w-5 text-muted-foreground" />}
                                                Week {week.weekNumber}: {week.title}
                                            </CardTitle>
                                            <CardDescription className="mt-1">{week.description}</CardDescription>
                                        </div>
                                        {isCurrentWeek && <Badge>Current</Badge>}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {/* Objectives */}
                                        <div>
                                            <div className="text-sm font-medium mb-2">Learning Objectives:</div>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                {week.objectives.map((obj, i) => (
                                                    <li key={i}>• {obj}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Progress */}
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Challenges</span>
                                                <span className="font-medium">
                                                    {weekCompleted} / {weekChallenges}
                                                </span>
                                            </div>
                                            <Progress value={(weekCompleted / weekChallenges) * 100} className="h-2" />
                                        </div>

                                        {/* CTA */}
                                        {isCurrentWeek && (
                                            <div className="pt-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {weekCompleted === 0 ? 'Start Week' : 'Continue'}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Coming Soon Notice */}
            <Card className="bg-muted">
                <CardHeader>
                    <CardTitle className="text-sm">🚧 MVP Phase</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Challenge submission interface and Linus AI review coming in the next update. For now, you
                        can view the curriculum and track your progress. Contact your mentor on Slack to get
                        started!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Calculate total number of challenges in program
 */
function calculateTotalChallenges(program: TrainingProgram): number {
    return program.curriculum.reduce((total, week) => total + week.challengeIds.length, 0);
}
