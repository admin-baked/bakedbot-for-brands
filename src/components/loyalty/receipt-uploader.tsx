'use client';

import { useState } from 'react';
import { useFileUpload } from '@/hooks/use-file-upload';
import { processReceiptAction } from '@/server/actions/receipts';
import { ExtractedReceipt } from '@/server/services/vision/receipt-scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, ScanLine, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export function ReceiptUploader() {
    const { files, uploadFiles, removeFile, clearFiles } = useFileUpload();
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ data: ExtractedReceipt; points: number } | null>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadFiles(e.target.files);
        }
    };

    const handleProcess = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setResult(null);

        try {
            // Take the first file
            const file = files[0];
            const response = await processReceiptAction(file.data as string); // base64

            if (response.success && response.data) {
                setResult({
                    data: response.data,
                    points: response.pointsEarned || 0,
                });
                toast({
                    title: 'Receipt Scanned!',
                    description: `You earned ${response.pointsEarned} loyalty points.`,
                });
            } else {
                toast({
                    title: 'Scan Failed',
                    description: response.error || 'Could not process receipt.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Something went wrong processing your receipt.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        clearFiles();
        setResult(null);
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-green-600" />
                    Scan Receipt
                </CardTitle>
                <CardDescription>
                    Upload a photo of your dispensary receipt to earn loyalty points.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!result ? (
                    <>
                        {/* Upload Area */}
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors relative">
                            {files.length > 0 ? (
                                <div className="relative w-full aspect-[3/4] max-h-64">
                                    {files[0].preview && (
                                        <Image
                                            src={files[0].preview}
                                            alt="Receipt Preview"
                                            fill
                                            className="object-contain rounded-lg"
                                        />
                                    )}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                                        onClick={() => removeFile(files[0].id)}
                                    >
                                        ×
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                                    <p className="text-sm font-medium text-slate-600 text-center">
                                        Tap to take photo or upload
                                    </p>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={files.length === 0 || isProcessing}
                            onClick={handleProcess}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Analyzing Receipt...
                                </>
                            ) : (
                                'Process Receipt'
                            )}
                        </Button>
                    </>
                ) : (
                    /* Result View */
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-green-50 p-6 rounded-xl text-center border border-green-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-green-900">+{result.points} Points</h3>
                            <p className="text-green-700 font-medium">Earned at {result.data.merchantName}</p>
                        </div>

                        <div className="bg-white border rounded-xl p-4 shadow-sm text-sm">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                <span className="text-slate-500">Date</span>
                                <span className="font-medium">{result.data.transactionDate || 'Today'}</span>
                            </div>
                            <div className="space-y-1 mb-2">
                                {result.data.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-slate-700">
                                        <span className="truncate max-w-[70%]">{item.name}</span>
                                        <span>${item.price.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t font-bold text-base">
                                <span>Total</span>
                                <span>${result.data.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <Button variant="outline" className="w-full" onClick={reset}>
                            Scan Another
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
