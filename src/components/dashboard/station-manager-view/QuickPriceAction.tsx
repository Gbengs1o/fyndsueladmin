import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Check, X, Loader2 } from 'lucide-react';
import { updateSinglePriceAdmin } from './actions';
import { useParams } from 'next/navigation';

interface QuickPriceActionProps {
    fuelType: string;
    initialPrice: number;
    stationId: number;
}

export default function QuickPriceAction({ fuelType, initialPrice, stationId }: QuickPriceActionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [price, setPrice] = useState(initialPrice);
    const [tempPrice, setTempPrice] = useState(initialPrice.toString());
    const [isUpdating, setIsUpdating] = useState(false);
    const params = useParams();
    const managerId = params.id as string;

    const handleUpdate = async () => {
        const newPriceNum = parseFloat(tempPrice);
        if (isNaN(newPriceNum) || newPriceNum === price) {
            setIsEditing(false);
            return;
        }

        setIsUpdating(true);
        try {
            await updateSinglePriceAdmin(fuelType, newPriceNum, stationId, managerId);
            setPrice(newPriceNum);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update price:', error);
            alert('Failed to update price');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
            <AnimatePresence mode="wait">
                {!isEditing ? (
                    <motion.div
                        key="display"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        onClick={() => setIsEditing(true)}
                        className="group"
                    >
                        <span style={{ fontSize: '2rem', fontWeight: 700 }}>₦{price}</span>
                        <Edit3 size={16} className="text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'hsl(var(--muted)/0.3)',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            border: '1px solid hsl(var(--primary))'
                        }}
                    >
                        <span className="font-bold text-primary">₦</span>
                        <input
                            autoFocus
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdate();
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'inherit',
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                width: '100px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="p-1 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                            >
                                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={isUpdating}
                                className="p-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
