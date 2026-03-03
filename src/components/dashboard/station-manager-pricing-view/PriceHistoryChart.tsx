'use client';

import styles from '../station-manager-view/ManagerOverview.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface PriceLog {
    date: string;
    price: number;
}

interface PriceHistoryChartProps {
    logs: PriceLog[];
    stateAverage: number;
}

const PAGE_SIZE = 7;

export default function PriceHistoryChart({ logs, stateAverage }: PriceHistoryChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [startIndex, setStartIndex] = useState(Math.max(0, logs.length - PAGE_SIZE));

    if (!logs || logs.length === 0) {
        return (
            <div className={styles.chartArea} style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                <Info size={40} style={{ marginBottom: '16px', margin: '0 auto' }} />
                <h3>No Price History Yet</h3>
                <p>Start updating your prices to see trends here.</p>
            </div>
        );
    }

    // Navigation logic
    const handleNext = () => setStartIndex(prev => Math.min(logs.length - PAGE_SIZE, prev + 2));
    const handlePrev = () => setStartIndex(prev => Math.max(0, prev - 2));

    const visibleLogs = logs.slice(startIndex, startIndex + PAGE_SIZE);
    const prices = visibleLogs.map(l => l.price);

    // Safety check for range to avoid division by zero
    const maxVal = Math.max(...prices, stateAverage);
    const minVal = Math.min(...prices, stateAverage);
    const range = (maxVal - minVal) || 20;
    const padding = range * 0.15;

    const maxPrice = maxVal + padding;
    const minPrice = minVal - padding;
    const finalRange = maxPrice - minPrice;

    const dataPoints = useMemo(() => visibleLogs.map((log, i) => {
        const x = visibleLogs.length > 1
            ? (i / (visibleLogs.length - 1)) * 100
            : 50;
        return {
            x,
            y: 100 - ((log.price - minPrice) / finalRange) * 100, // 0 is top, 100 is bottom
            price: log.price,
            date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        };
    }), [visibleLogs, minPrice, finalRange]);

    // Cubic Bezier path generator
    const linePath = useMemo(() => {
        if (dataPoints.length < 2) {
            if (dataPoints.length === 1) {
                return `M 40,${dataPoints[0].y} L 60,${dataPoints[0].y}`;
            }
            return "";
        }
        let path = `M ${dataPoints[0].x},${dataPoints[0].y}`;
        for (let i = 0; i < dataPoints.length - 1; i++) {
            const p0 = dataPoints[i];
            const p1 = dataPoints[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            path += ` C ${cp1x},${p0.y} ${cp1x},${p1.y} ${p1.x},${p1.y}`;
        }
        return path;
    }, [dataPoints]);

    const areaPath = dataPoints.length > 1
        ? `${linePath} L 100,100 L 0,100 Z`
        : "";

    const stateAvgY = 100 - ((stateAverage - minPrice) / finalRange) * 100;

    // Only show Markers if we have enough points and meaningful variance
    const showMarkers = visibleLogs.length > 2 && (maxVal - minVal > 2);
    const highPoint = showMarkers ? dataPoints.reduce((max, p) => p.price > max.price ? p : max, dataPoints[0]) : null;

    return (
        <div className={styles.chartArea} style={{ position: 'relative', overflow: 'visible' }}>

            {/* Header Section */}
            <div className={styles.sectionHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Market Price Analytics</h2>
                        <p className="text-muted-foreground text-sm mt-1">30-Day performance window</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={handlePrev}
                            disabled={startIndex === 0}
                            style={{
                                background: 'hsl(var(--secondary))',
                                border: '1px solid hsl(var(--border))',
                                color: startIndex === 0 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                                padding: '6px',
                                borderRadius: '8px',
                                cursor: startIndex === 0 ? 'default' : 'pointer',
                                display: 'flex'
                            }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={startIndex >= logs.length - PAGE_SIZE}
                            style={{
                                background: 'hsl(var(--secondary))',
                                border: '1px solid hsl(var(--border))',
                                color: startIndex >= logs.length - PAGE_SIZE ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                                padding: '6px',
                                borderRadius: '8px',
                                cursor: startIndex >= logs.length - PAGE_SIZE ? 'default' : 'pointer',
                                display: 'flex'
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid hsl(var(--primary))', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', color: 'hsl(var(--primary))', fontWeight: 700, marginLeft: '8px' }}>
                            LIVE TREND
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div
                style={{
                    position: 'relative',
                    height: '280px',
                    background: 'hsl(var(--background))',
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    marginTop: '10px'
                }}
                onMouseLeave={() => setHoveredPoint(null)}
            >
                {/* 1. HTML Layer for Non-Stretched Elements (Text, Labels, Markers) */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>

                    {/* State Avg HTML Text */}
                    <div style={{
                        position: 'absolute',
                        top: `${stateAvgY}%`,
                        left: '10px',
                        transform: 'translateY(-120%)',
                        color: '#f59e0b',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                    }}>
                        OYO AVG: ₦{stateAverage}
                    </div>

                    {/* Peak Marker in HTML to prevent oval stretching */}
                    {highPoint && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={`high-${startIndex}`}
                            style={{
                                position: 'absolute',
                                left: `${highPoint.x}%`,
                                top: `${highPoint.y}%`,
                                transform: 'translate(-50%, -50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <div style={{ color: '#22c55e', fontSize: '0.65rem', fontWeight: 800, transform: 'translateY(-100%)', position: 'absolute', top: '-6px' }}>
                                PEAK
                            </div>
                            <div style={{
                                width: '10px',
                                height: '10px',
                                background: 'rgba(34, 197, 94, 0.2)',
                                border: '2px solid #22c55e',
                                borderRadius: '50%'
                            }} />
                        </motion.div>
                    )}

                    {/* Hover Active Dot */}
                    {hoveredPoint !== null && (
                        <div style={{
                            position: 'absolute',
                            left: `${dataPoints[hoveredPoint].x}%`,
                            top: `${dataPoints[hoveredPoint].y}%`,
                            width: '12px',
                            height: '12px',
                            background: 'hsl(var(--primary))',
                            border: '3px solid hsl(var(--background))',
                            borderRadius: '50%',
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                        }} />
                    )}
                </div>

                {/* 2. Scalable SVG Layer for Grid & Paths */}
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}
                >
                    <defs>
                        <linearGradient id="chartGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                        </linearGradient>

                        <filter id="lineGlow2" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Background Grid */}
                    {[0, 25, 50, 75, 100].map(val => (
                        <line
                            key={`grid-${val}`}
                            x1="0" y1={val} x2="100" y2={val}
                            stroke="hsl(var(--border))"
                            vectorEffect="non-scaling-stroke" // PREVENTS STRETCHING
                            strokeWidth="1"
                        />
                    ))}

                    {/* State Average Line */}
                    <line
                        x1="0" y1={stateAvgY} x2="100" y2={stateAvgY}
                        stroke="#f59e0b"
                        vectorEffect="non-scaling-stroke"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                    />

                    {/* Active Point Vertical Line */}
                    {hoveredPoint !== null && (
                        <line
                            x1={dataPoints[hoveredPoint].x} y1="0"
                            x2={dataPoints[hoveredPoint].x} y2="100"
                            stroke="hsl(var(--border))"
                            vectorEffect="non-scaling-stroke"
                            strokeWidth="1"
                        />
                    )}

                    {/* Data Area & Line */}
                    <AnimatePresence mode="wait">
                        <motion.g key={startIndex}>
                            {areaPath && (
                                <motion.path
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    d={areaPath}
                                    fill="url(#chartGradient2)"
                                />
                            )}
                            <motion.path
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                d={linePath}
                                fill="none"
                                stroke="hsl(var(--primary))"
                                vectorEffect="non-scaling-stroke" // KEEPS LINE CRISP
                                strokeWidth="3"
                                strokeLinecap="round"
                                style={{ filter: 'url(#lineGlow2)' }}
                            />
                        </motion.g>
                    </AnimatePresence>
                </svg>

                {/* 3. Invisible Interaction Layer */}
                <div
                    style={{ position: 'absolute', inset: 0, zIndex: 20 }}
                    onMouseMove={(e) => {
                        const bounds = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - bounds.left) / bounds.width) * 100;
                        const closest = dataPoints.reduce((prev, curr, idx) =>
                            Math.abs(curr.x - x) < Math.abs(dataPoints[prev].x - x) ? idx : prev, 0);
                        setHoveredPoint(closest);
                    }}
                />

                {/* 4. Tooltip */}
                <AnimatePresence>
                    {hoveredPoint !== null && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                position: 'absolute',
                                left: `${dataPoints[hoveredPoint].x}%`,
                                top: `${dataPoints[hoveredPoint].y}%`,
                                transform: 'translate(-50%, -130%)',
                                background: 'hsl(var(--card))',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid hsl(var(--primary))',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                zIndex: 50,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div className="text-muted-foreground uppercase text-xs mb-1">
                                {dataPoints[hoveredPoint].date}
                            </div>
                            <div className="font-bold text-foreground text-lg">
                                ₦{dataPoints[hoveredPoint].price}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Date Labels below chart */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px 0 10px' }}>
                <span className="text-muted-foreground font-bold text-xs">
                    {visibleLogs[0].date}
                </span>
                <span className="text-muted-foreground font-bold text-xs">
                    {visibleLogs[visibleLogs.length - 1].date}
                </span>
            </div>

            {/* Legend & Pagination Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 10px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', background: 'hsl(var(--primary))', borderRadius: '3px' }}></div>
                        <span className="font-semibold text-sm">Your Price</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '0', borderTop: '2px dashed #f59e0b' }}></div>
                        <span className="font-semibold text-sm">State Avg</span>
                    </div>
                </div>
                <div className="text-muted-foreground text-sm font-medium">
                    Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, logs.length)} of {logs.length} updates
                </div>
            </div>
        </div>
    );
}
