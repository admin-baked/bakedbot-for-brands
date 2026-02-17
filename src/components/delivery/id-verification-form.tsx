'use client';

/**
 * ID Verification Form
 *
 * NY OCM-compliant age verification at point of delivery
 * Requirements:
 * - Must verify customer is 21+ years old
 * - Must record ID type, last 4 of ID number, and birth date
 * - Must confirm identity matches order
 * - Rejects if under 21 or unresponsive
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

type IDType = 'drivers_license' | 'state_id' | 'passport' | 'military_id';

interface IDVerificationFormProps {
    onVerification: (result: {
        verified: boolean;
        idType?: IDType;
        idNumber?: string; // Last 4 digits only
        birthDate?: string;
        rejectionReason?: string;
    }) => void;
    disabled?: boolean;
}

const ID_TYPE_LABELS: Record<IDType, string> = {
    drivers_license: "Driver's License",
    state_id: 'State ID',
    passport: 'Passport',
    military_id: 'Military ID',
};

export function IDVerificationForm({ onVerification, disabled = false }: IDVerificationFormProps) {
    const [idType, setIdType] = useState<IDType>('drivers_license');
    const [idLastFour, setIdLastFour] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<
        'pending' | 'verified' | 'rejected'
    >('pending');
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionOptions, setShowRejectionOptions] = useState(false);

    const calculateAge = (birthDateStr: string): number => {
        const today = new Date();
        const birth = new Date(birthDateStr);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const handleVerify = () => {
        if (!birthDate || !idLastFour) return;

        const age = calculateAge(birthDate);

        if (age < 21) {
            setVerificationStatus('rejected');
            const reason = `Customer is ${age} years old — under 21`;
            setRejectionReason(reason);
            onVerification({
                verified: false,
                idType,
                idNumber: idLastFour,
                birthDate,
                rejectionReason: reason,
            });
            return;
        }

        setVerificationStatus('verified');
        onVerification({
            verified: true,
            idType,
            idNumber: idLastFour,
            birthDate,
        });
    };

    const handleReject = (reason: string) => {
        setVerificationStatus('rejected');
        setRejectionReason(reason);
        setShowRejectionOptions(false);
        onVerification({
            verified: false,
            rejectionReason: reason,
        });
    };

    const handleReset = () => {
        setVerificationStatus('pending');
        setIdLastFour('');
        setBirthDate('');
        setRejectionReason('');
        setShowRejectionOptions(false);
        onVerification({ verified: false });
    };

    return (
        <Card
            className={
                verificationStatus === 'verified'
                    ? 'border-green-500 dark:border-green-400'
                    : verificationStatus === 'rejected'
                    ? 'border-red-500 dark:border-red-400'
                    : ''
            }
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        ID Verification (21+)
                    </CardTitle>
                    {verificationStatus === 'verified' && (
                        <Badge className="bg-green-500 text-white">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                        </Badge>
                    )}
                    {verificationStatus === 'rejected' && (
                        <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Rejected
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    NY OCM: Must verify customer identity and age before completing delivery
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Verified State */}
                {verificationStatus === 'verified' && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold text-green-800 dark:text-green-200">
                                    Age Verification Passed
                                </div>
                                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                                    {ID_TYPE_LABELS[idType]} •{' '}
                                    {birthDate &&
                                        `Born ${new Date(birthDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}`}{' '}
                                    • Age: {birthDate && calculateAge(birthDate)}
                                </div>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-muted-foreground"
                            onClick={handleReset}
                            disabled={disabled}
                        >
                            Reset Verification
                        </Button>
                    </div>
                )}

                {/* Rejected State */}
                {verificationStatus === 'rejected' && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold text-red-800 dark:text-red-200">
                                    Delivery Cannot Be Completed
                                </div>
                                <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                                    Reason: {rejectionReason}
                                </div>
                                <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                                    Return product to dispensary. Record rejection in delivery log.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Verification Form (pending only) */}
                {verificationStatus === 'pending' && (
                    <>
                        {/* ID Type */}
                        <div className="space-y-2">
                            <Label>ID Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(ID_TYPE_LABELS) as IDType[]).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setIdType(type)}
                                        disabled={disabled}
                                        className={`p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                            idType === type
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background border-border hover:bg-muted'
                                        }`}
                                    >
                                        {ID_TYPE_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ID Last 4 */}
                        <div className="space-y-2">
                            <Label htmlFor="idLastFour">Last 4 digits of ID</Label>
                            <Input
                                id="idLastFour"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{4}"
                                maxLength={4}
                                placeholder="####"
                                value={idLastFour}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setIdLastFour(val);
                                }}
                                disabled={disabled}
                            />
                        </div>

                        {/* Birth Date */}
                        <div className="space-y-2">
                            <Label htmlFor="birthDate">Date of Birth</Label>
                            <Input
                                id="birthDate"
                                type="date"
                                value={birthDate}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setBirthDate(e.target.value)}
                                disabled={disabled}
                            />
                            {birthDate && (
                                <p className="text-sm text-muted-foreground">
                                    Age:{' '}
                                    <strong className={calculateAge(birthDate) < 21 ? 'text-red-500' : 'text-green-600'}>
                                        {calculateAge(birthDate)} years old
                                    </strong>
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            <Button
                                type="button"
                                className="w-full"
                                onClick={handleVerify}
                                disabled={!birthDate || idLastFour.length < 4 || disabled}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify Age & Identity
                            </Button>

                            {/* Rejection Options */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full text-destructive hover:text-destructive"
                                onClick={() => setShowRejectionOptions(!showRejectionOptions)}
                                disabled={disabled}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cannot Complete — Reject Delivery
                                {showRejectionOptions ? (
                                    <ChevronUp className="ml-auto h-4 w-4" />
                                ) : (
                                    <ChevronDown className="ml-auto h-4 w-4" />
                                )}
                            </Button>

                            {showRejectionOptions && (
                                <div className="bg-muted rounded-lg p-3 space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Select Rejection Reason
                                    </p>
                                    {[
                                        'No valid ID presented',
                                        'Customer under 21 years old',
                                        'ID expired',
                                        'Customer appears intoxicated',
                                        'Address mismatch',
                                        'Customer not present',
                                        'Refused to show ID',
                                    ].map((reason) => (
                                        <button
                                            key={reason}
                                            type="button"
                                            onClick={() => handleReject(reason)}
                                            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-background transition-colors text-destructive"
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* NY OCM Notice */}
                <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                        <strong>NY OCM Requirement:</strong> Cannabis may only be delivered to
                        individuals 21 years of age or older. Verify government-issued photo ID.
                        Delivery must be refused if customer cannot verify age.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
