'use client';

import { motion } from 'framer-motion';

interface QuickPriceActionProps {
    fuelType: string;
    initialPrice: number;
}

export default function QuickPriceAction({ fuelType, initialPrice }: QuickPriceActionProps) {
    return (
        <div style={{ position: 'relative', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
                <span style={{ fontSize: '2rem', fontWeight: 700 }}>₦{initialPrice}</span>
            </motion.div>
        </div>
    );
}
