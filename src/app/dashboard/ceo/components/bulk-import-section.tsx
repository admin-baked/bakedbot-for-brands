'use client';

/**
 * Bulk Import Section Component
 * File upload, preview, and import for brand/dispensary pages
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    Upload,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    FileUp,
    Building2,
    Sparkles,
} from 'lucide-react';
import {
    validateBrandPagesCSV,
    importBrandPagesAction,
    validateDispensaryPagesCSV,
    importDispensaryPagesAction
} from '../actions';
import type { CSVPreview, BulkImportResult } from '@/types/foot-traffic';

interface BulkImportSectionProps {
    onImportComplete?: () => void;
}

type ImportType = 'brand' | 'dispensary';

export function BulkImportSection({ onImportComplete }: BulkImportSectionProps) {
    const { toast } = useToast();
    const [importType, setImportType] = useState<ImportType>('brand');
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [preview, setPreview] = useState<CSVPreview | null>(null);
    const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
    const [showResultDialog, setShowResultDialog] = useState(false);

    // Handle file drop
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            await processFile(file);
        }
    }, [importType]);

    // Handle file selection
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
        // Reset input
        e.target.value = '';
    }, [importType]);

    // Process uploaded CSV file
    const processFile = async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            toast({ title: 'Invalid File', description: 'Please upload a CSV file.', variant: 'destructive' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: 'File Too Large', description: 'Maximum file size is 5MB.', variant: 'destructive' });
            return;
        }

        setIsProcessing(true);
        try {
            const csvText = await file.text();

            // Use the appropriate validator based on import type
            const result = importType === 'brand'
                ? await validateBrandPagesCSV(csvText)
                : await validateDispensaryPagesCSV(csvText);

            setPreview(result);

            if (result.validRows === 0) {
                toast({ title: 'No Valid Rows', description: 'The CSV contains no valid rows to import.', variant: 'destructive' });
            }
        } catch (error: any) {
            console.error('CSV processing error:', error);
            toast({ title: 'Processing Error', description: error.message || 'Failed to process CSV file.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Execute import
    const handleImport = async () => {
        if (!preview || preview.validRows === 0) return;

        setIsImporting(true);
        try {
            // Filter to valid rows only
            const validRows = preview.rows.filter((_, index) => {
                return !preview.errors.some(e => e.row === index);
            });

            // Use the appropriate importer based on import type
            const result = importType === 'brand'
                ? await importBrandPagesAction(validRows as any)
                : await importDispensaryPagesAction(validRows as any);

            setImportResult(result);
            setShowResultDialog(true);

            if (!result.errors.length) {
                const pageType = importType === 'brand' ? 'brand' : 'dispensary';
                toast({ title: 'Import Successful!', description: `Created ${result.createdPages.length} ${pageType} pages.` });
                setPreview(null);
                onImportComplete?.();
            }
        } catch (error: any) {
            console.error('Import error:', error);
            toast({ title: 'Import Failed', description: error.message || 'Failed to import pages.', variant: 'destructive' });
        } finally {
            setIsImporting(false);
        }
    };

    // Download CSV template
    const downloadTemplate = (type: ImportType) => {
        let csvContent: string;

        if (type === 'brand') {
            csvContent = `brand_name,zone_name,state,city,zip_codes,radius,priority,cta_type,cta_url,featured_products,status
Jeeter,LA Metro Core,CA,Los Angeles,"90011,90044,90003",15,10,Order Online,https://jeeter.com/products,"Jeeter Baby Cannon;Jeeter XL",published
Stiiizy,,CA,San Francisco,94102-94110,20,8,View Products,https://stiiizy.com/menu,,draft`;
        } else {
            csvContent = `dispensary_name,state,city,zip_code,featured,status
Haven Cannabis,CA,Los Angeles,90011,TRUE,published
Green Oasis,IL,Chicago,60629,FALSE,draft`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'brand' ? 'brand_pages_template.csv' : 'dispensary_pages_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Reset preview when switching types
    const handleTypeChange = (type: string) => {
        setImportType(type as ImportType);
        setPreview(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Bulk Import
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Import brand or dispensary pages from CSV files
                    </p>
                </div>
            </div>

            {/* Type Selector Tabs */}
            <Tabs value={importType} onValueChange={handleTypeChange}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="brand" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Brand Pages
                    </TabsTrigger>
                    <TabsTrigger value="dispensary" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Dispensary Pages
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="brand" className="pt-4">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" size="sm" onClick={() => downloadTemplate('brand')}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Brand CSV Template
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="dispensary" className="pt-4">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" size="sm" onClick={() => downloadTemplate('dispensary')}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Dispensary CSV Template
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Upload Zone */}
            {!preview && (
                <Card
                    className={`border-2 border-dashed transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
                                <p className="text-muted-foreground">Processing {importType} CSV...</p>
                            </>
                        ) : (
                            <>
                                <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium mb-2">
                                    Drop your {importType === 'brand' ? 'Brand' : 'Dispensary'} CSV file here
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                                <label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <Button variant="outline" asChild>
                                        <span>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Select CSV File
                                        </span>
                                    </Button>
                                </label>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Preview */}
            {preview && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {importType === 'brand' ? (
                                        <Sparkles className="h-5 w-5 text-primary" />
                                    ) : (
                                        <Building2 className="h-5 w-5 text-primary" />
                                    )}
                                    {importType === 'brand' ? 'Brand' : 'Dispensary'} Import Preview
                                </CardTitle>
                                <CardDescription>Review your data before importing</CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {preview.validRows} Valid
                                </Badge>
                                {preview.invalidRows > 0 && (
                                    <Badge variant="outline" className="text-red-600 border-red-600">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {preview.invalidRows} Invalid
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Errors */}
                        {preview.errors.length > 0 && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                                <h4 className="font-medium text-destructive flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Validation Errors ({preview.errors.length})
                                </h4>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {preview.errors.slice(0, 10).map((err, i) => (
                                        <p key={i} className="text-sm text-destructive">
                                            Row {err.row + 1}: {err.field} - {err.message}
                                        </p>
                                    ))}
                                    {preview.errors.length > 10 && (
                                        <p className="text-sm text-muted-foreground">
                                            ... and {preview.errors.length - 10} more errors
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Data Table */}
                        <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background">
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Status</TableHead>
                                        {preview.headers.slice(0, 6).map((h, i) => (
                                            <TableHead key={i}>{h}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.rows.slice(0, 50).map((row, rowIndex) => {
                                        const rowErrors = preview.errors.filter(e => e.row === rowIndex);
                                        const isValid = rowErrors.length === 0;

                                        return (
                                            <TableRow key={rowIndex} className={!isValid ? 'bg-destructive/5' : ''}>
                                                <TableCell className="font-mono text-xs">{rowIndex + 1}</TableCell>
                                                <TableCell>
                                                    {isValid ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                    )}
                                                </TableCell>
                                                {preview.headers.slice(0, 6).map((h, i) => (
                                                    <TableCell key={i} className="text-sm max-w-32 truncate">
                                                        {row[h] || '-'}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        {preview.rows.length > 50 && (
                            <p className="text-sm text-muted-foreground text-center">
                                Showing first 50 of {preview.rows.length} rows
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => setPreview(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={preview.validRows === 0 || isImporting}
                            >
                                {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Import {preview.validRows} Valid {importType === 'brand' ? 'Brand' : 'Dispensary'} Pages
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Result Dialog */}
            <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {importResult?.errors.length === 0 ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            )}
                            Import Complete
                        </DialogTitle>
                        <DialogDescription>
                            {importResult && (
                                <div className="space-y-2 mt-4">
                                    <p><strong>Total rows:</strong> {importResult.totalRows}</p>
                                    <p className="text-green-600">
                                        <strong>{importType === 'brand' ? 'Brand' : 'Dispensary'} pages created:</strong> {importResult.createdPages.length}
                                    </p>
                                    {importResult.skippedRows.length > 0 && (
                                        <p className="text-yellow-600"><strong>Rows skipped:</strong> {importResult.skippedRows.length}</p>
                                    )}
                                    {importResult.errors.length > 0 && (
                                        <p className="text-red-600"><strong>Errors:</strong> {importResult.errors.length}</p>
                                    )}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowResultDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
