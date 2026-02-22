'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ChevronRight, AlertTriangle, CheckCircle, Copy, Zap, RefreshCw, Play } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  listProjectFiles,
  readProjectFile,
  writeProjectFile,
  getGitLog,
  getCommitDiff,
  revertCommit,
  runTypeCheck,
  getAiFix,
  commitFiles,
  getDeploymentHistory,
  triggerDeploy,
  getBuildStatusLive,
  listSchedulerJobs,
  triggerSchedulerJob,
  runSuperPower,
} from '@/server/actions/dev-console-actions';
import { cn } from '@/lib/utils';

// Lazy load PuffChat for AI Coder tab
const PuffChat = dynamic(() => import('./puff-chat').then(m => m.PuffChat), { ssr: false });

type Tab = 'code' | 'git' | 'typeck' | 'ai' | 'deployments' | 'superpowers';

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  relativeDate: string;
}

export function DevConsoleTab() {
  const [activeTab, setActiveTab] = useState<Tab>('code');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b overflow-x-auto">
        <Button
          variant={activeTab === 'code' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('code')}
          className="rounded-b-none"
        >
          Code Fixer
        </Button>
        <Button
          variant={activeTab === 'git' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('git')}
          className="rounded-b-none"
        >
          Git History
        </Button>
        <Button
          variant={activeTab === 'typeck' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('typeck')}
          className="rounded-b-none"
        >
          Type Check
        </Button>
        <div className="border-l mx-1" />
        <Button
          variant={activeTab === 'ai' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('ai')}
          className="rounded-b-none"
        >
          AI Coder
        </Button>
        <Button
          variant={activeTab === 'deployments' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('deployments')}
          className="rounded-b-none"
        >
          Deployments
        </Button>
        <Button
          variant={activeTab === 'superpowers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('superpowers')}
          className="rounded-b-none"
        >
          Super Powers
        </Button>
      </div>

      {activeTab === 'code' && <CodeFixerTab onTypeCheck={() => setActiveTab('typeck')} />}
      {activeTab === 'git' && <GitHistoryTab />}
      {activeTab === 'typeck' && <TypeCheckTab />}
      {activeTab === 'ai' && <AiCoderTab />}
      {activeTab === 'deployments' && <DeploymentsTab />}
      {activeTab === 'superpowers' && <SuperPowersTab />}
    </div>
  );
}

// =============================================================================
// CODE FIXER TAB (7A)
// =============================================================================

function CodeFixerTab({ onTypeCheck }: { onTypeCheck: () => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [fileFilter, setFileFilter] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load files on mount
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      try {
        const result = await listProjectFiles('src');
        setFiles(result);
        setFilteredFiles(result);
      } catch (e: any) {
        console.error('Failed to load files:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, []);

  // Filter files
  useEffect(() => {
    const filtered = files.filter(f =>
      f.toLowerCase().includes(fileFilter.toLowerCase())
    );
    setFilteredFiles(filtered);
  }, [fileFilter, files]);

  // Load file on selection
  const handleSelectFile = async (file: string) => {
    setSelectedFile(file);
    setIsLoading(true);
    setAiSuggestion('');
    setErrorMessage('');
    setIsEditMode(false);

    try {
      const content = await readProjectFile(file);
      setFileContent(content);
      setEditContent(content);
    } catch (e: any) {
      setErrorMessage(`Failed to load file: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get AI fix
  const handleGetFix = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const suggestion = await getAiFix(selectedFile, fileContent, errorMessage);
      setAiSuggestion(suggestion);
    } catch (e: any) {
      setErrorMessage(`AI fix failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply AI suggestion
  const handleApplyFix = () => {
    setEditContent(aiSuggestion);
    setIsEditMode(true);
  };

  // Save and commit
  const handleSaveAndCommit = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      // Write file
      await writeProjectFile(selectedFile, editContent);

      // Commit
      const msg = `fix: Update ${selectedFile.split('/').pop()}`;
      await commitFiles(msg);

      setFileContent(editContent);
      setIsEditMode(false);
      setErrorMessage('');
    } catch (e: any) {
      setErrorMessage(`Save failed: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Get language from file extension
  const getLanguage = (file: string): string => {
    const ext = file.split('.').pop() || 'text';
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      json: 'json',
      md: 'markdown',
      yaml: 'yaml',
      yml: 'yaml',
      css: 'css',
      html: 'html',
      sql: 'sql',
    };
    return langMap[ext] || 'text';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Code Fixer</CardTitle>
        <CardDescription>Browse, edit, and fix your project files with AI assistance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 h-[600px]">
          {/* File Browser */}
          <div className="border rounded-lg flex flex-col">
            <div className="p-3 border-b">
              <Input
                placeholder="Filter files..."
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoading && <div className="text-xs text-muted-foreground p-2">Loading...</div>}
                {filteredFiles.map((file) => (
                  <button
                    key={file}
                    onClick={() => handleSelectFile(file)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors',
                      selectedFile === file && 'bg-accent'
                    )}
                  >
                    {file.split('/').pop()}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Code Viewer */}
          <div className="col-span-3 border rounded-lg flex flex-col">
            {selectedFile ? (
              <>
                <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground">{selectedFile}</span>
                  {errorMessage && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>

                {/* Tabs: View vs Edit */}
                <div className="flex border-b">
                  <Button
                    variant={!isEditMode ? 'ghost' : 'outline'}
                    size="sm"
                    onClick={() => setIsEditMode(false)}
                    className="rounded-none"
                  >
                    View
                  </Button>
                  <Button
                    variant={isEditMode ? 'ghost' : 'outline'}
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                    className="rounded-none"
                  >
                    Edit
                  </Button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1">
                  {!isEditMode ? (
                    <div className="p-4">
                      <SyntaxHighlighter
                        language={getLanguage(selectedFile)}
                        style={oneDark}
                        className="!bg-transparent !p-0 !rounded-none"
                        wrapLines={true}
                      >
                        {fileContent}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full border-0 rounded-none font-mono text-sm resize-none"
                      placeholder="Edit your code..."
                    />
                  )}
                </ScrollArea>

                {/* Actions */}
                <div className="p-3 border-t space-y-2">
                  {errorMessage && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {errorMessage}
                    </div>
                  )}

                  {aiSuggestion && !isEditMode && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs space-y-1">
                      <div className="font-semibold">AI Suggestion</div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleApplyFix}
                        disabled={isLoading}
                        className="w-full"
                      >
                        Apply Suggestion
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!isEditMode && (
                      <>
                        <Input
                          placeholder="Error message (optional)..."
                          value={errorMessage}
                          onChange={(e) => setErrorMessage(e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={handleGetFix}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Get Fix'}
                        </Button>
                      </>
                    )}

                    {isEditMode && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditContent(fileContent);
                            setIsEditMode(false);
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAndCommit}
                          disabled={isSaving}
                          className="flex-1"
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save & Commit'}
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onTypeCheck}
                    >
                      Type Check
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a file to view
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// GIT HISTORY TAB (7B)
// =============================================================================

function GitHistoryTab() {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [revertError, setRevertError] = useState('');

  // Load commits on mount
  useEffect(() => {
    const loadCommits = async () => {
      setIsLoading(true);
      try {
        const result = await getGitLog(20);
        setCommits(result);
      } catch (e: any) {
        console.error('Failed to load commits:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadCommits();
  }, []);

  // Load diff when commit selected
  const handleSelectCommit = async (commit: GitCommit) => {
    setSelectedHash(commit.date); // date field stores full hash
    setIsLoading(true);
    setDiffContent('');
    setRevertError('');

    try {
      const diff = await getCommitDiff(commit.date);
      setDiffContent(diff);
    } catch (e: any) {
      setRevertError(`Failed to load diff: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Revert commit
  const handleRevert = async () => {
    if (!selectedHash) return;

    setIsReverting(true);
    try {
      const result = await revertCommit(selectedHash);
      setRevertError(result.message);
      setShowRevertDialog(false);
      // Reload commits
      const newCommits = await getGitLog(20);
      setCommits(newCommits);
    } catch (e: any) {
      setRevertError(`Revert failed: ${e.message}`);
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Git History</CardTitle>
        <CardDescription>View recent commits and revert if needed</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 h-[600px]">
          {/* Commit List */}
          <div className="border rounded-lg flex flex-col">
            <div className="p-3 border-b font-semibold text-sm">Recent Commits</div>
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {isLoading && <div className="text-xs text-muted-foreground p-2">Loading...</div>}
                {commits.map((commit) => (
                  <button
                    key={commit.date}
                    onClick={() => handleSelectCommit(commit)}
                    className={cn(
                      'w-full text-left px-2 py-2 rounded text-xs hover:bg-accent transition-colors border',
                      selectedHash === commit.date ? 'border-primary bg-accent' : 'border-transparent'
                    )}
                  >
                    <div className="font-mono text-xs font-bold">{commit.hash}</div>
                    <div className="truncate text-xs text-muted-foreground">{commit.message}</div>
                    <div className="text-xs text-muted-foreground">{commit.author}</div>
                    <div className="text-xs text-muted-foreground">{commit.relativeDate}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Diff Viewer */}
          <div className="col-span-2 border rounded-lg flex flex-col">
            {selectedHash ? (
              <>
                <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                  <span className="text-sm font-mono">Diff</span>
                  {revertError && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>

                <ScrollArea className="flex-1">
                  {diffContent ? (
                    <div className="p-4">
                      <SyntaxHighlighter
                        language="diff"
                        style={oneDark}
                        className="!bg-transparent !p-0 !rounded-none"
                        wrapLines={true}
                      >
                        {diffContent}
                      </SyntaxHighlighter>
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Loading diff...
                    </div>
                  )}
                </ScrollArea>

                <div className="p-3 border-t space-y-2">
                  {revertError && (
                    <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      {revertError}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowRevertDialog(true)}
                    disabled={isReverting}
                    className="w-full"
                  >
                    {isReverting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Revert This Commit'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a commit to view diff
              </div>
            )}
          </div>
        </div>

        {/* Revert Confirmation Dialog */}
        <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revert Commit?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new revert commit on main. You can then push with:
                <code className="block mt-2 p-2 bg-muted rounded text-xs">git push origin main</code>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevert} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Revert
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TYPE CHECK TAB
// =============================================================================

function TypeCheckTab() {
  const [output, setOutput] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRunCheck = async () => {
    setIsLoading(true);
    setOutput('');
    setErrorCount(0);

    try {
      const result = await runTypeCheck();
      setOutput(result.output);
      setErrorCount(result.errorCount);
      setIsSuccess(result.success);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Type Check</CardTitle>
        <CardDescription>Run TypeScript type checker</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleRunCheck}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Run Type Check'}
          </Button>

          {output && (
            <div className="flex items-center gap-2 ml-auto">
              {isSuccess ? (
                <><CheckCircle className="h-4 w-4 text-green-600" /> <span className="text-sm">Build passing</span></>
              ) : (
                <><AlertTriangle className="h-4 w-4 text-destructive" /> <span className="text-sm">{errorCount} errors</span></>
              )}
            </div>
          )}
        </div>

        {output && (
          <div className="border rounded-lg bg-muted/50">
            <pre className="p-4 overflow-auto max-h-[500px] text-xs font-mono whitespace-pre-wrap break-words">
              {output}
            </pre>
          </div>
        )}

        {!output && !isLoading && (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Click "Run Type Check" to start
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// AI CODER TAB (7C)
// =============================================================================

function AiCoderTab() {
  const [lastCommit, setLastCommit] = useState<GitCommit | null>(null);
  const [currentBranch, setCurrentBranch] = useState('main');

  useEffect(() => {
    const loadContext = async () => {
      try {
        const commits = await getGitLog(1);
        if (commits.length > 0) {
          setLastCommit(commits[0]);
        }
      } catch (e) {
        console.error('Failed to load context:', e);
      }
    };

    loadContext();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Coder</CardTitle>
        <CardDescription>Use natural language to write and fix code with Linus CTO</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context Header */}
        <div className="bg-muted/50 border rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Branch</div>
              <div className="font-mono font-bold">{currentBranch}</div>
            </div>
            {lastCommit && (
              <div>
                <div className="text-xs text-muted-foreground">Last Commit</div>
                <div className="font-mono text-xs truncate">{lastCommit.message}</div>
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="secondary" className="text-xs">
              Fix TypeScript errors
            </Button>
            <Button size="sm" variant="secondary" className="text-xs">
              Add error handling
            </Button>
            <Button size="sm" variant="secondary" className="text-xs">
              Optimize performance
            </Button>
          </div>
        </div>

        {/* PuffChat Embedding */}
        <div className="border rounded-lg h-[600px]">
          <PuffChat
            persona="linus"
            isSuperUser={true}
            isHired={true}
            hideHeader={true}
            className="h-full border-0 shadow-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DEPLOYMENTS TAB (7D)
// =============================================================================

interface BuildRecord {
  id: string;
  status: 'SUCCESS' | 'FAILURE' | 'WORKING' | 'PENDING' | 'QUEUED' | 'CANCELLED';
  commitHash: string;
  commitMessage: string;
  duration: number;
  timestamp: number;
}

function DeploymentsTab() {
  const [buildHistory, setBuildHistory] = useState<BuildRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Load build history on mount and auto-refresh
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const history = await getDeploymentHistory(10);
        setBuildHistory(history);
      } catch (e: any) {
        console.error('Failed to load build history:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();

    // Auto-refresh every 30 seconds
    const timer = setInterval(loadHistory, 30000);
    setRefreshTimer(timer);

    return () => clearInterval(timer);
  }, []);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployError('');

    try {
      const result = await triggerDeploy();
      if (result.success) {
        setShowDeployDialog(false);
        // Reload history
        const history = await getDeploymentHistory(10);
        setBuildHistory(history);
      } else {
        setDeployError(result.message);
      }
    } catch (e: any) {
      setDeployError(e.message);
    } finally {
      setIsDeploying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="inline-flex items-center gap-1 text-green-600"><span className="h-2 w-2 rounded-full bg-green-600" />Success</span>;
      case 'FAILURE':
        return <span className="inline-flex items-center gap-1 text-red-600"><span className="h-2 w-2 rounded-full bg-red-600" />Failed</span>;
      case 'WORKING':
        return <span className="inline-flex items-center gap-1 text-yellow-600"><span className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />Building</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-gray-600"><span className="h-2 w-2 rounded-full bg-gray-600" />{status}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployments</CardTitle>
        <CardDescription>Monitor Firebase App Hosting deployments and trigger new builds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deploy Button */}
        <div className="flex gap-2">
          <AlertDialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
            <Button
              onClick={() => setShowDeployDialog(true)}
              disabled={isDeploying}
              className="gap-2"
            >
              {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deploy to Production'}
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deploy to Production?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will push your current changes to main and trigger a Firebase App Hosting build.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deployError && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {deployError}
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeploy} disabled={isDeploying}>
                  {isDeploying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : ''}
                  Deploy
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsLoading(true);
              const history = await getDeploymentHistory(10);
              setBuildHistory(history);
              setIsLoading(false);
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Build History Table */}
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50">
                <TableRow>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-24">Commit</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-24">Duration</TableHead>
                  <TableHead className="w-32">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : buildHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No deployments found
                    </TableCell>
                  </TableRow>
                ) : (
                  buildHistory.map((build) => (
                    <TableRow key={build.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{getStatusBadge(build.status)}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{build.commitHash}</TableCell>
                      <TableCell className="text-sm truncate">{build.commitMessage}</TableCell>
                      <TableCell className="text-sm">{build.duration}s</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(build.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SUPER POWERS TAB (7E)
// =============================================================================

function SuperPowersTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningPower, setRunningPower] = useState<string | null>(null);

  const superPowers = [
    { key: 'audit_indexes', label: 'Audit Indexes', icon: '📊' },
    { key: 'fix_build', label: 'Fix Build', icon: '🔧' },
    { key: 'test_security', label: 'Test Security', icon: '🔒' },
    { key: 'audit_schema', label: 'Audit Schema', icon: '📋' },
    { key: 'audit_costs', label: 'Audit Costs', icon: '💰' },
    { key: 'seed_test_data', label: 'Seed Test Data', icon: '🌱' },
    { key: 'setup_monitor', label: 'Setup Monitor', icon: '📈' },
    { key: 'check_compliance', label: 'Check Compliance', icon: '✅' },
    { key: 'generate_report', label: 'Generate Report', icon: '📄' },
    { key: 'backup_firestore', label: 'Backup Firestore', icon: '💾' },
    { key: 'health_check', label: 'Health Check', icon: '💊' },
  ];

  // Load scheduler jobs on mount
  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      try {
        const schedulerJobs = await listSchedulerJobs();
        setJobs(schedulerJobs);
      } catch (e: any) {
        console.error('Failed to load scheduler jobs:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadJobs();
  }, []);

  const handleRunPower = async (powerKey: string) => {
    setIsRunning(true);
    setRunningPower(powerKey);
    setOutput('');

    try {
      const result = await runSuperPower(powerKey);
      setOutput(result.output);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setIsRunning(false);
      setRunningPower(null);
    }
  };

  const handleTriggerJob = async (jobName: string) => {
    try {
      const result = await triggerSchedulerJob(jobName);
      setOutput(`Job triggered: ${jobName}\n\n${result.message}`);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Super Powers</CardTitle>
        <CardDescription>Run developer utilities and manage Cloud Scheduler jobs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scheduler Jobs Section */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Cloud Scheduler Jobs</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No scheduler jobs found</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="w-24">State</TableHead>
                    <TableHead className="w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.name}>
                      <TableCell className="font-mono text-xs">{job.name}</TableCell>
                      <TableCell className="text-sm">{job.schedule}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-xs font-semibold',
                          job.state === 'ENABLED' ? 'text-green-600' : 'text-gray-600'
                        )}>
                          {job.state}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTriggerJob(job.name)}
                          disabled={isRunning}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Super Powers Section */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Developer Super Powers</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {superPowers.map((power) => (
              <Button
                key={power.key}
                variant="outline"
                size="sm"
                onClick={() => handleRunPower(power.key)}
                disabled={isRunning}
                className="flex flex-col h-auto py-2"
              >
                <span className="text-lg">{power.icon}</span>
                <span className="text-xs text-center">{power.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Output Terminal */}
        {output && (
          <div className="border rounded-lg bg-muted/50">
            <div className="p-3 border-b bg-muted text-sm font-semibold">Output</div>
            <pre className="p-4 overflow-auto max-h-[300px] text-xs font-mono whitespace-pre-wrap break-words">
              {output}
            </pre>
          </div>
        )}

        {isRunning && !output && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Running {runningPower}...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
