'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Mail, Calendar, FileSpreadsheet, HardDrive, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IntegrationStatus } from '@/server/actions/integrations'; // Ensure this type is exported or redefine

interface SystemHealthCheckProps {
    status: {
        gmail: IntegrationStatus;
        calendar: IntegrationStatus;
        drive: IntegrationStatus;
        sheets: IntegrationStatus;
    };
    onConnect: (service: string) => void;
    onRefresh: () => void;
    isLoading?: boolean;
}

export function SystemHealthCheck({ status, onConnect, onRefresh, isLoading }: SystemHealthCheckProps) {
    const services = [
        { id: 'gmail', label: 'Comms Uplink (Gmail)', icon: Mail },
        { id: 'calendar', label: 'Schedule Sync (Calendar)', icon: Calendar },
        { id: 'drive', label: 'Knowledge Base (Drive)', icon: HardDrive },
        { id: 'sheets', label: 'Data Grid (Sheets)', icon: FileSpreadsheet },
    ];

    const allActive = Object.values(status).every(s => s === 'active');

    return (
        <div className="w-full max-w-md mx-auto my-4 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-sm mb-6">
            {/* Header */}
            <div className="bg-slate-900/50 p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className={cn("h-4 w-4", allActive ? "text-emerald-500" : "text-amber-500")} />
                    <span className="font-semibold text-slate-200">SYSTEM DIAGNOSTICS</span>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-slate-500 hover:text-slate-300"
                    onClick={onRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
            </div>

            {/* Status Grid */}
            <div className="p-4 space-y-3">
                <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Core Infrastructure</div>
                
                {services.map((service) => {
                    const s = status[service.id as keyof typeof status];
                    const isActive = s === 'active';
                    const isError = s === 'error';

                    return (
                        <div key={service.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-800 text-slate-400"
                                )}>
                                    <service.icon className="h-4 w-4" />
                                </div>
                                <span className={cn("text-slate-300", isActive && "text-emerald-400 font-medium")}>
                                    {service.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-xs">
                                    {isActive ? (
                                        <span className="text-emerald-500 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> ONLINE
                                        </span>
                                    ) : (
                                        <span className={cn("flex items-center gap-1", isError ? "text-red-500" : "text-slate-500")}>
                                            {isError ? <AlertCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                            {isError ? 'ERROR' : 'OFFLINE'}
                                        </span>
                                    )}
                                </div>

                                {!isActive && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 bg-transparent"
                                        onClick={() => onConnect(service.id)}
                                    >
                                        CONNECT
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="bg-slate-900/30 p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                <span>BakedBot OS v2.5.0</span>
                {allActive && (
                    <span className="flex items-center gap-1 text-emerald-600">
                        <ShieldCheck className="h-3 w-3" /> FLEET FULLY OPERATIONAL
                    </span>
                )}
            </div>
        </div>
    );
}
