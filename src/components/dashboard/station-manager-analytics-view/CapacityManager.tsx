'use client';

import React, { useState } from 'react';
import { updateStationCapacity } from './actions';
import { Settings, Info, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CapacityManagerProps {
    stationId: string | number;
    initialCapacity: number;
    peakVisits: number;
}

export default function CapacityManager({ stationId, initialCapacity, peakVisits }: CapacityManagerProps) {
    const [capacity, setCapacity] = useState(initialCapacity || 500);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const usagePercentage = capacity > 0 ? Math.min(Math.round((peakVisits / capacity) * 100), 100) : 0;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateStationCapacity(stationId, capacity);
            setIsEditing(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Error updating station capacity:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-muted/30 p-5 rounded-2xl border border-border shadow-sm mb-8 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 relative group">
                        <span className="font-semibold text-[0.95rem]">Station Capacity Usage</span>
                        <Info size={14} className="text-muted-foreground cursor-help" />

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[220px] bg-foreground/95 backdrop-blur-md p-3 rounded-xl text-xs text-background z-10 border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <strong>What is this?</strong><br />
                            This measures how much of your station's total capacity is being used based on your peak daily visitors.
                            <br /><br />
                            <strong>How to set capacity?</strong><br />
                            Input the maximum number of drivers your station can handle in a single 24-hour period (e.g., number of pumps × average cars per hour × hours open).
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        Based on your max capacity of <strong>{capacity}</strong>.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span
                        className="font-bold text-xl"
                        style={{ color: usagePercentage > 80 ? '#ef4444' : usagePercentage > 50 ? '#f97316' : '#22c55e' }}
                    >
                        {usagePercentage}%
                    </span>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="border-none text-primary text-xs flex items-center gap-1 cursor-pointer py-1 px-2 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                        <Settings size={12} /> {isEditing ? 'Cancel' : 'Configure Capacity'}
                    </button>
                </div>
            </div>

            <div className="bg-border h-2.5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercentage}%` }}
                    className="h-full rounded-full"
                    style={{
                        background: usagePercentage > 80 ? '#ef4444' : '#22c55e'
                    }}
                />
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className="bg-white/5 p-4 rounded-xl border border-border">
                            <label className="text-xs block mb-2 text-muted-foreground">
                                Set Max Daily Capacity (Drivers/Day)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={capacity}
                                    onChange={(e) => setCapacity(Number(e.target.value))}
                                    className="flex-1 bg-background border border-border rounded-lg py-2 px-3 text-foreground outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                    disabled={isSaving}
                                    onClick={handleSave}
                                    className="bg-primary text-primary-foreground border-none rounded-lg py-2 px-4 cursor-pointer flex items-center gap-2 text-sm font-semibold disabled:opacity-70 hover:opacity-90 transition-opacity"
                                >
                                    {isSaving ? '...' : <><Save size={16} /> Save</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 text-green-500 text-xs flex items-center gap-2 justify-center"
                    >
                        <Check size={14} /> Capacity updated successfully!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
