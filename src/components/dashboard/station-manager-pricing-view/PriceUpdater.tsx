'use client';

import { useState } from 'react';
import { updateStationPricesAdmin } from './actions';
import styles from '../station-manager-view/ManagerOverview.module.css';
import { Button } from '@/components/ui/button';

interface PriceUpdaterProps {
    currentPrices: {
        pms: number;
        ago: number;
        dpk: number;
    };
    stationId: number;
    managerId: string;
}

export default function PriceUpdater({ currentPrices, stationId, managerId }: PriceUpdaterProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsUpdating(true);
        setSuccess(false);

        const formData = new FormData(event.currentTarget);
        try {
            await updateStationPricesAdmin(formData, stationId, managerId);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update prices. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    }

    return (
        <div className={styles.chartArea} style={{ background: 'hsl(var(--surface))', border: '1px dashed hsl(var(--primary))' }}>
            <div className={styles.sectionHeader}>
                <h2>Instant Price Updater</h2>
                <p>Updates will reflect instantly on the Fynd Fuel customer app and log the admin as the updater.</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.priceEditGrid}>
                <div className={styles.priceInputCard}>
                    <label>PMS (Petrol)</label>
                    <div className={styles.inputWrapper}>
                        <span>₦</span>
                        <input type="number" name="pms" defaultValue={currentPrices.pms} step="0.01" required />
                    </div>
                </div>
                <div className={styles.priceInputCard}>
                    <label>AGO (Diesel)</label>
                    <div className={styles.inputWrapper}>
                        <span>₦</span>
                        <input type="number" name="ago" defaultValue={currentPrices.ago} step="0.01" required />
                    </div>
                </div>
                <div className={styles.priceInputCard}>
                    <label>DPK (Kerosene)</label>
                    <div className={styles.inputWrapper}>
                        <span>₦</span>
                        <input type="number" name="dpk" defaultValue={currentPrices.dpk} step="0.01" required />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
                    <Button
                        type="submit"
                        disabled={isUpdating}
                        className="w-full sm:w-auto text-base"
                        size="lg"
                    >
                        {isUpdating ? 'Updating...' : 'Publish Changes'}
                    </Button>
                    {success && <span className="text-emerald-500 font-medium">✅ Prices Updated successfully!</span>}
                </div>
            </form>
        </div>
    );
}
