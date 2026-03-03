import { useState } from 'react';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import { toggleStockStatusAdmin } from './actions';
import { useParams } from 'next/navigation';

interface StockOutToggleProps {
    stationId: number;
    isOutOfStock: boolean;
}

export default function StockOutToggle({ stationId, isOutOfStock: initialStatus }: StockOutToggleProps) {
    const [isOutOfStock, setIsOutOfStock] = useState(initialStatus);
    const [isLoading, setIsLoading] = useState(false);
    const params = useParams();
    const managerId = params.id as string;

    async function handleToggle() {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const newStatus = !isOutOfStock;
            await toggleStockStatusAdmin(stationId, newStatus, managerId);
            setIsOutOfStock(newStatus);
        } catch (error) {
            console.error('Failed to toggle stock status:', error);
            alert('Failed to update stock status.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div
            onClick={handleToggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: isOutOfStock ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)',
                borderRadius: '12px',
                border: `1px solid ${isOutOfStock ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                cursor: isLoading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.7 : 1
            }}
            className="hover:shadow-md active:scale-95"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isLoading ? (
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                ) : isOutOfStock ? (
                    <AlertCircle size={20} color="#ef4444" />
                ) : (
                    <Activity size={20} color="#22c55e" />
                )}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {isOutOfStock ? 'Currently Offline / Out of Stock' : 'Station is Active & Live'}
                </span>
            </div>
            <div style={{
                width: '36px',
                height: '20px',
                background: isOutOfStock ? '#ef4444' : '#22c55e',
                borderRadius: '20px',
                position: 'relative',
                transition: 'background 0.3s ease'
            }}>
                <div style={{
                    width: '14px',
                    height: '14px',
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '3px',
                    left: isOutOfStock ? '19px' : '3px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
            </div>
        </div>
    );
}
