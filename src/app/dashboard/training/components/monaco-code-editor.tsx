/**
 * Monaco Code Editor Component
 *
 * VS Code-like editor for writing code submissions.
 * Provides syntax highlighting, IntelliSense, and error checking.
 */

'use client';

import { useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { editor } from 'monaco-editor';

interface MonacoCodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    height?: string;
    readOnly?: boolean;
    showMinimap?: boolean;
}

export function MonacoCodeEditor({
    value,
    onChange,
    language = 'typescript',
    height = '500px',
    readOnly = false,
    showMinimap = true,
}: MonacoCodeEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    function handleEditorDidMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
        editorRef.current = editor;

        // Configure TypeScript compiler options
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types'],
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
        });

        // Add BakedBot type definitions (basic)
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            `
declare module '@/server/auth/auth' {
    export function requireUser(roles?: string[]): Promise<{ uid: string; email: string }>;
}

declare module '@/lib/logger' {
    export const logger: {
        info: (message: string, meta?: any) => void;
        error: (message: string, meta?: any) => void;
        warn: (message: string, meta?: any) => void;
        debug: (message: string, meta?: any) => void;
    };
}

declare module '@/firebase/admin' {
    import { Firestore } from '@google-cloud/firestore';
    export function getAdminFirestore(): Firestore;
}

type ActionResult<T = any> =
    | { success: true; data: T }
    | { success: false; error: string };
`,
            'ts:bakedbot-types.d.ts'
        );

        // Set theme to match system
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs-light');
    }

    function handleEditorChange(value: string | undefined) {
        onChange(value || '');
    }

    return (
        <Card className="overflow-hidden border-2 border-muted">
            <Editor
                height={height}
                language={language}
                value={value}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                loading={
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }
                options={{
                    readOnly,
                    minimap: {
                        enabled: showMinimap,
                    },
                    fontSize: 14,
                    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    wordWrap: 'on',
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        useShadows: true,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                    },
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: false,
                    },
                    parameterHints: {
                        enabled: true,
                    },
                    formatOnPaste: true,
                    formatOnType: true,
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    bracketPairColorization: {
                        enabled: true,
                    },
                }}
            />
        </Card>
    );
}
