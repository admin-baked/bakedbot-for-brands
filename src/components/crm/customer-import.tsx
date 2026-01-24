'use client';

/**
 * Customer Import Component
 *
 * Upload CSV or Excel files to import customers.
 * Handles automatic column normalization with manual override option.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    Users,
    ArrowRight,
    HelpCircle,
} from 'lucide-react';
import {
    validateCustomerImport,
    importCustomers,
    getCustomerImportTemplate,
    type CustomerImportPreview,
    type CustomerImportResult,
    type ManualColumnMapping,
} from '@/server/actions/customer-import';
import type { ImportableCustomerField } from '@/lib/customer-import/column-mapping';

interface CustomerImportProps {
    orgId: string;
    onImportComplete?: () => void;
}

// Available fields for manual mapping
const MAPPABLE_FIELDS = [
    { value: '', label: '-- Skip this column --' },
    { value: 'email', label: 'Email (Required)' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'displayName', label: 'Full Name' },
    { value: 'phone', label: 'Phone' },
    { value: 'totalSpent', label: 'Total Spent ($)' },
    { value: 'orderCount', label: 'Order Count' },
    { value: 'avgOrderValue', label: 'Avg Order Value' },
    { value: 'lastOrderDate', label: 'Last Order Date' },
    { value: 'firstOrderDate', label: 'First Order Date' },
    { value: 'segment', label: 'Segment' },
    { value: 'tier', label: 'Loyalty Tier' },
    { value: 'points', label: 'Points Balance' },
    { value: 'lifetimeValue', label: 'Lifetime Value' },
    { value: 'customTags', label: 'Tags (comma-separated)' },
    { value: 'preferredCategories', label: 'Preferred Categories' },
    { value: 'birthDate', label: 'Birthday' },
    { value: 'source', label: 'Acquisition Source' },
    { value: 'acquisitionCampaign', label: 'Campaign' },
    { value: 'referralCode', label: 'Referral Code' },
    { value: 'equityStatus', label: 'Social Equity Status' },
    { value: 'notes', label: 'Notes' },
];

export function CustomerImport({ orgId, onImportComplete }: CustomerImportProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'csv' | 'xlsx'>('csv');
    const [preview, setPreview] = useState<CustomerImportPreview | null>(null);
    const [manualMapping, setManualMapping] = useState<ManualColumnMapping>({});
    const [importResult, setImportResult] = useState<CustomerImportResult | null>(null);
    const [showResultDialog, setShowResultDialog] = useState(false);
    const [showMappingHelp, setShowMappingHelp] = useState(false);

    // Handle file drop
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            await processFile(file);
        }
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
        e.target.value = '';
    }, []);

    // Process uploaded file
    const processFile = async (file: File) => {
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

        if (!isCSV && !isExcel) {
            toast({
                title: 'Invalid File Type',
                description: 'Please upload a CSV or Excel (.xlsx) file.',
                variant: 'destructive'
            });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'File Too Large',
                description: 'Maximum file size is 10MB.',
                variant: 'destructive'
            });
            return;
        }

        setIsProcessing(true);
        setManualMapping({});

        try {
            let content: string;
            const type: 'csv' | 'xlsx' = isCSV ? 'csv' : 'xlsx';

            if (isExcel) {
                // Read as base64 for Excel
                content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result as string;
                        resolve(result.split(',')[1]); // Remove data:...;base64, prefix
                    };
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsDataURL(file);
                });
            } else {
                // Read as text for CSV
                content = await file.text();
            }

            setFileContent(content);
            setFileType(type);

            const result = await validateCustomerImport(content, type);
            setPreview(result);

            if (result.validRows === 0 && result.errors.length > 0) {
                toast({
                    title: 'Validation Failed',
                    description: result.errors[0]?.message || 'No valid rows found.',
                    variant: 'destructive'
                });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast({
                title: 'Processing Error',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle manual mapping change
    const handleMappingChange = async (original: string, mapped: string) => {
        const newMapping: ManualColumnMapping = {
            ...manualMapping,
            [original]: (mapped || null) as ImportableCustomerField | null
        };
        setManualMapping(newMapping);

        // Re-validate with new mapping
        if (fileContent) {
            setIsProcessing(true);
            try {
                const result = await validateCustomerImport(fileContent, fileType, newMapping);
                setPreview(result);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    // Execute import
    const handleImport = async () => {
        if (!fileContent || !preview || preview.validRows === 0) return;

        setIsImporting(true);
        try {
            const result = await importCustomers(orgId, fileContent, fileType, manualMapping);

            setImportResult(result);
            setShowResultDialog(true);

            if (result.success) {
                toast({
                    title: 'Import Successful!',
                    description: `Imported ${result.imported} new customers, updated ${result.updated}.`
                });
                setPreview(null);
                setFileContent(null);
                onImportComplete?.();
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast({
                title: 'Import Failed',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setIsImporting(false);
        }
    };

    // Download template
    const downloadTemplate = async () => {
        try {
            const template = await getCustomerImportTemplate();
            const blob = new Blob([template], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'customer_import_template.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast({
                title: 'Download Failed',
                description: 'Could not download template.',
                variant: 'destructive'
            });
        }
    };

    // Reset
    const handleReset = () => {
        setPreview(null);
        setFileContent(null);
        setManualMapping({});
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Import Customers
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Upload a CSV or Excel file to import your customer list
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                </Button>
            </div>

            {/* Upload Zone */}
            {!preview && (
                <Card
                    className={`border-2 border-dashed transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
                                <p className="text-muted-foreground">Processing file...</p>
                            </>
                        ) : (
                            <>
                                <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium mb-2">
                                    Drop your customer file here
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Supports CSV and Excel (.xlsx) files up to 10MB
                                </p>
                                <label>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <Button variant="outline" asChild>
                                        <span>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Select File
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
                                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                                    Import Preview
                                </CardTitle>
                                <CardDescription>
                                    Review column mapping and data before importing
                                </CardDescription>
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

                    <CardContent className="space-y-6">
                        {/* Errors */}
                        {preview.errors.length > 0 && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                                <h4 className="font-medium text-destructive flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Validation Errors
                                </h4>
                                <div className="max-h-24 overflow-y-auto space-y-1">
                                    {preview.errors.slice(0, 5).map((err, i) => (
                                        <p key={i} className="text-sm text-destructive">
                                            {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                                        </p>
                                    ))}
                                    {preview.errors.length > 5 && (
                                        <p className="text-sm text-muted-foreground">
                                            ... and {preview.errors.length - 5} more errors
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {preview.warnings.length > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <h4 className="font-medium text-yellow-700 flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Warnings
                                </h4>
                                <div className="max-h-24 overflow-y-auto space-y-1">
                                    {preview.warnings.slice(0, 3).map((warn, i) => (
                                        <p key={i} className="text-sm text-yellow-700">
                                            {warn.message}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Column Mapping */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium flex items-center gap-2">
                                    Column Mapping
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => setShowMappingHelp(true)}
                                    >
                                        <HelpCircle className="h-4 w-4" />
                                    </Button>
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Adjust mappings if columns weren&apos;t auto-detected
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {preview.mappingSummary.map((item) => (
                                    <div key={item.index} className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded truncate max-w-24">
                                                {item.original}
                                            </span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        </div>
                                        <Select
                                            value={manualMapping[item.original] ?? item.mapped ?? ''}
                                            onValueChange={(value) => handleMappingChange(item.original, value)}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select field..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MAPPABLE_FIELDS.map((field) => (
                                                    <SelectItem key={field.value} value={field.value}>
                                                        {field.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sample Data Preview */}
                        <div>
                            <h4 className="font-medium mb-3">Sample Data (First 5 Rows)</h4>
                            <div className="border rounded-lg overflow-x-auto max-h-[250px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            {preview.headers.slice(0, 6).map((h, i) => (
                                                <TableHead key={i} className="min-w-[100px]">
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-mono">{h}</span>
                                                        {preview.mappingSummary[i]?.mapped && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {preview.mappingSummary[i].mapped}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.sampleRows.map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                <TableCell className="font-mono text-xs">
                                                    {rowIndex + 1}
                                                </TableCell>
                                                {preview.headers.slice(0, 6).map((h, i) => (
                                                    <TableCell key={i} className="text-sm max-w-32 truncate">
                                                        {String(row[h] || '-')}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {preview.totalRows > 5 && (
                                <p className="text-sm text-muted-foreground text-center mt-2">
                                    Showing 5 of {preview.totalRows} rows
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={handleReset}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={preview.validRows === 0 || isImporting}
                            >
                                {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Import {preview.validRows} Customer{preview.validRows !== 1 ? 's' : ''}
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
                            {importResult?.success ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            )}
                            Import Complete
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 mt-4">
                                {importResult && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-green-600">
                                                    {importResult.imported}
                                                </p>
                                                <p className="text-sm text-muted-foreground">New Customers</p>
                                            </div>
                                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {importResult.updated}
                                                </p>
                                                <p className="text-sm text-muted-foreground">Updated</p>
                                            </div>
                                        </div>
                                        {importResult.skipped > 0 && (
                                            <p className="text-sm text-yellow-600">
                                                {importResult.skipped} rows skipped due to errors
                                            </p>
                                        )}
                                        {importResult.errors.length > 0 && (
                                            <div className="bg-destructive/10 rounded-lg p-3">
                                                <p className="font-medium text-destructive text-sm mb-2">
                                                    Errors ({importResult.errors.length}):
                                                </p>
                                                <div className="max-h-32 overflow-y-auto space-y-1">
                                                    {importResult.errors.slice(0, 5).map((err, i) => (
                                                        <p key={i} className="text-xs text-destructive">
                                                            Row {err.row}: {err.message}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowResultDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mapping Help Dialog */}
            <Dialog open={showMappingHelp} onOpenChange={setShowMappingHelp}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Column Mapping Help</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-4 mt-4 text-left">
                                <p className="text-sm">
                                    We automatically detect common column names. If your columns
                                    weren&apos;t recognized, you can manually map them.
                                </p>

                                <div>
                                    <h4 className="font-medium mb-2">Auto-detected formats:</h4>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li>• <code className="bg-muted px-1">email</code>, <code className="bg-muted px-1">customer_email</code>, <code className="bg-muted px-1">e-mail</code></li>
                                        <li>• <code className="bg-muted px-1">first_name</code>, <code className="bg-muted px-1">firstname</code>, <code className="bg-muted px-1">fname</code></li>
                                        <li>• <code className="bg-muted px-1">phone</code>, <code className="bg-muted px-1">mobile</code>, <code className="bg-muted px-1">cell</code></li>
                                        <li>• <code className="bg-muted px-1">total_spent</code>, <code className="bg-muted px-1">ltv</code>, <code className="bg-muted px-1">revenue</code></li>
                                        <li>• <code className="bg-muted px-1">order_count</code>, <code className="bg-muted px-1">orders</code>, <code className="bg-muted px-1">visits</code></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-2">Tips:</h4>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li>• Email is the only required field</li>
                                        <li>• Dates can be in most common formats (YYYY-MM-DD, MM/DD/YYYY)</li>
                                        <li>• Tags and categories can be comma-separated</li>
                                        <li>• Currency symbols and commas are automatically removed from amounts</li>
                                    </ul>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowMappingHelp(false)}>Got it</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
