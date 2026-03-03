'use client';

import React from 'react';
import { Target, Info } from 'lucide-react';

interface SystemConversionEfficiencyProps {
    conversionRate: number; // e.g., % of registered users who have submitted reports
    description?: string;
}

export default function SystemConversionEfficiency({ conversionRate, description = "% of total registered users who actively contribute data." }: SystemConversionEfficiencyProps) {
    return (
        <div className="bg-muted/30 p-5 rounded-2xl border border-border shadow-sm mb-0 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 relative group">
                        <span className="font-semibold text-[0.95rem]">Platform Activation Rate</span>
                        <Info size={14} className="text-muted-foreground cursor-help" />

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-0 mb-2 w-[220px] bg-foreground/95 backdrop-blur-md p-3 rounded-xl text-xs text-background z-10 border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <strong>What is this?</strong><br />
                            Measures the percentage of total registered app users who have actively submitted at least one price report recently.
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        Overall community participation health.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span
                        className="font-bold text-xl"
                        style={{ color: conversionRate > 75 ? '#22c55e' : conversionRate > 40 ? '#f97316' : '#ef4444' }}
                    >
                        {conversionRate}%
                    </span>
                    <div className="p-1.5 bg-primary/10 text-primary rounded-lg mt-1">
                        <Target size={14} />
                    </div>
                </div>
            </div>

            <div className="bg-border h-2.5 rounded-full overflow-hidden mb-3">
                <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                        width: `${Math.min(conversionRate, 100)}%`,
                        background: conversionRate > 75 ? '#22c55e' : conversionRate > 40 ? '#f97316' : '#ef4444'
                    }}
                />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed m-0">
                {description}
            </p>
        </div>
    );
}
