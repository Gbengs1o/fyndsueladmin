'use client';

import styles from '../station-manager-view/ManagerOverview.module.css';

interface PriceLog {
    id: string;
    fuel_type: string;
    old_price: number;
    new_price: number;
    created_at: string;
}

interface PriceHistoryTableProps {
    logs: PriceLog[];
}

export default function PriceHistoryTable({ logs }: PriceHistoryTableProps) {
    if (!logs || logs.length === 0) {
        return (
            <div className={styles.chartArea} style={{ marginTop: '24px' }}>
                <p className="text-muted-foreground text-center">No price updates recorded yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.chartArea} style={{ marginTop: '24px' }}>
            <div className={styles.sectionHeader}>
                <h2>Update History</h2>
                <p>Detailed log of every price change for this station.</p>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Fuel Type</th>
                            <th>Old Price</th>
                            <th>New Price</th>
                            <th>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => {
                            const diff = (log.new_price - (log.old_price || 0)).toFixed(2);
                            const isPositive = parseFloat(diff) > 0;
                            const date = new Date(log.created_at).toLocaleString('en-NG', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            return (
                                <tr key={log.id}>
                                    <td>{date}</td>
                                    <td>
                                        <span style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>
                                            {log.fuel_type}
                                        </span>
                                    </td>
                                    <td>₦{log.old_price?.toFixed(2) || '0.00'}</td>
                                    <td style={{ fontWeight: 700 }}>₦{log.new_price.toFixed(2)}</td>
                                    <td>
                                        <span className={`${styles.priceDiff} ${isPositive ? styles.negative : styles.positive}`}>
                                            {isPositive ? '+' : ''}{diff}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
