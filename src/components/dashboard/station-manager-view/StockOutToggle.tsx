'use client';

import { Activity, AlertCircle } from 'lucide-react';

interface StockOutToggleProps {
    stationId: number;
    isOutOfStock: boolean;
}

export default function StockOutToggle({ stationId, isOutOfStock }: StockOutToggleProps) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: isOutOfStock ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)',
            borderRadius: '12px',
            border: `1px solid ${isOutOfStock ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isOutOfStock ? (
                    <AlertCircle size={20} color="#ef4444" />
                ) : (
                    <Activity size={20} color="#22c55e" />
                )}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {isOutOfStock ? 'Currently Offline / Out of Stock' : 'Station is Active & Live'}
                </span>
            </div>
        </div>
    );
}
