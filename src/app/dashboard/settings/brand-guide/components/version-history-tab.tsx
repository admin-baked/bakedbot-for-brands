/**
 * Version History Tab
 *
 * View brand guide version history and rollback to previous versions.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Clock, User, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getVersionHistory, rollbackToVersion } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandGuideVersion } from '@/types/brand-guide';

interface VersionHistoryTabProps {
  brandId: string;
  brandGuide: BrandGuide;
}

export function VersionHistoryTab({ brandId, brandGuide }: VersionHistoryTabProps) {
  const [versions, setVersions] = useState<BrandGuideVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVersionHistory();
  }, [brandId]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const result = await getVersionHistory(brandId);
      if (result.success && result.versions) {
        setVersions(result.versions);
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (version: number) => {
    if (
      !confirm(
        `Are you sure you want to rollback to version ${version}? This will create a new version with the previous state.`
      )
    ) {
      return;
    }

    setRollingBack(true);

    try {
      const result = await rollbackToVersion(brandId, version);

      if (!result.success) {
        throw new Error(result.error || 'Rollback failed');
      }

      toast({
        title: 'Version Restored',
        description: `Successfully rolled back to version ${version}.`,
      });

      // Reload version history
      await loadVersionHistory();

      // Reload page to show updated brand guide
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Rollback Failed',
        description: error instanceof Error ? error.message : 'Failed to rollback version',
        variant: 'destructive',
      });
    } finally {
      setRollingBack(false);
    }
  };

  const formatDate = (date: Date | { seconds: number; nanoseconds: number }): string => {
    let jsDate: Date;

    if (date instanceof Date) {
      jsDate = date;
    } else if ('seconds' in date) {
      jsDate = new Date(date.seconds * 1000);
    } else {
      return 'Unknown date';
    }

    return jsDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeSummary = (changes: BrandGuideVersion['changes']): string => {
    if (changes.length === 0) return 'No changes';
    if (changes.length === 1) return changes[0].field;
    if (changes.length === 2) return `${changes[0].field} and ${changes[1].field}`;
    return `${changes[0].field} and ${changes.length - 1} other fields`;
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Clock className="w-4 h-4" />
        <AlertDescription>
          All changes to your brand guide are automatically tracked. You can restore any previous
          version at any time.
        </AlertDescription>
      </Alert>

      {/* Current Version */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Current Version</CardTitle>
                <CardDescription>Version {brandGuide.version}</CardDescription>
              </div>
            </div>
            <Badge>Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Last updated: {formatDate(brandGuide.lastUpdatedAt)}</span>
            </div>
            {brandGuide.lastUpdatedBy && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Updated by: {brandGuide.lastUpdatedBy}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>Previous versions of your brand guide</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p>No version history yet.</p>
              <p className="text-sm mt-1">
                As you make changes, previous versions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <Card key={version.version} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Version Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">Version {version.version}</h4>
                          {version.isActive && <Badge variant="secondary">Active</Badge>}
                          {version.tags && version.tags.length > 0 && (
                            <Badge variant="outline">{version.tags[0]}</Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(version.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{version.updatedBy}</span>
                          </div>
                        </div>

                        {/* Changes */}
                        {version.changes && version.changes.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Changes:</p>
                            <div className="space-y-1">
                              {version.changes.slice(0, 3).map((change, index) => (
                                <div
                                  key={index}
                                  className="text-sm p-2 bg-muted rounded flex items-start gap-2"
                                >
                                  <span className="font-medium text-primary">
                                    {change.field}:
                                  </span>
                                  <span className="text-muted-foreground flex-1">
                                    {change.reason || 'Updated'}
                                  </span>
                                </div>
                              ))}
                              {version.changes.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  + {version.changes.length - 3} more changes
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(version.version)}
                          disabled={rollingBack || version.isActive}
                        >
                          {rollingBack ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4 mr-2" />
                          )}
                          Restore
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
