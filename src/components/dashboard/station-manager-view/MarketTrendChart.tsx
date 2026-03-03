'use client';

import styles from './ManagerOverview.module.css';

interface TrendPoint {
    day: string;
    yourPrice: number;
    marketAvg: number;
}

export default function MarketTrendChart({ data }: { data: TrendPoint[] }) {
    if (!data || data.length === 0) {
        return <div className={styles.placeholderChart}>No data available</div>;
    }

    const maxPrice = Math.max(...data.map(d => Math.max(d.yourPrice, d.marketAvg))) + 10;
    const minPrice = Math.min(...data.map(d => Math.min(d.yourPrice, d.marketAvg))) - 10;
    const range = maxPrice - minPrice || 1; // Avoid division by zero

    const getY = (price: number) => 160 - ((price - minPrice) / range) * 120;
    const getX = (index: number) => 40 + (index * ((360 - 40) / (data.length - 1 || 1)));

    const yourPath = data.map((d, i) => `${getX(i)},${getY(d.yourPrice)}`).join(' ');
    const marketPath = data.map((d, i) => `${getX(i)},${getY(d.marketAvg)}`).join(' ');

    return (
        <div className={styles.placeholderChart} style={{ padding: '0', background: 'transparent' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="none">
                {/* Grid Lines */}
                <line x1="40" y1="40" x2="40" y2="160" stroke="hsl(var(--border))" strokeWidth="1" />
                <line x1="40" y1="160" x2="360" y2="160" stroke="hsl(var(--border))" strokeWidth="1" />

                {/* Market Avg Line (Dashed) */}
                <polyline
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    points={marketPath}
                    style={{ opacity: 0.5 }}
                />

                {/* Your Price Line (Solid Primary) */}
                <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    points={yourPath}
                />

                {/* Data Points */}
                {data.map((d, i) => (
                    <g key={i}>
                        <circle cx={getX(i)} cy={getY(d.yourPrice)} r="4" fill="hsl(var(--primary))" />
                        <text x={getX(i)} y="185" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{d.day}</text>
                    </g>
                ))}

                {/* Legend */}
                <g transform="translate(280, 20)">
                    <line x1="0" y1="0" x2="20" y2="0" stroke="hsl(var(--primary))" strokeWidth="3" />
                    <text x="25" y="4" fill="hsl(var(--foreground))" fontSize="10">You</text>
                    <line x1="0" y1="15" x2="20" y2="15" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="3,3" />
                    <text x="25" y="19" fill="hsl(var(--muted-foreground))" fontSize="10">Market</text>
                </g>
            </svg>
        </div>
    );
}
