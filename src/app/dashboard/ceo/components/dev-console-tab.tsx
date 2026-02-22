'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, ChevronRight, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
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
} from '@/server/actions/dev-console-actions';
import { cn } from '@/lib/utils';

type Tab = 'code' | 'git' | 'typeck';

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
      <div className="flex gap-2 border-b">
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
      </div>

      {activeTab === 'code' && <CodeFixerTab onTypeCheck={() => setActiveTab('typeck')} />}
      {activeTab === 'git' && <GitHistoryTab />}
      {activeTab === 'typeck' && <TypeCheckTab />}
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
