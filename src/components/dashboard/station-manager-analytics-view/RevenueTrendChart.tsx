'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChartData {
    date: string;
    interactions: number;
    visits: number;
}

export default function RevenueTrendChart({ data }: { data: ChartData[] }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Filter out zero data for cleaner initial state if needed
    const hasData = data.some(d => d.visits > 0 || d.interactions > 0);

    const chartPoints = useMemo(() => {
        if (!hasData) return { revenuePath: '', visitsPath: '', revenueArea: '', yLabels: [] as number[], getY: (v: number) => 0 };

        const maxVal = Math.max(...data.map(d => Math.max(d.interactions, d.visits, 5)));
        const width = 800;
        const height = 250;
        const padding = 20;

        const getX = (i: number) => (i / (data.length - 1)) * (width - padding * 2) + padding;
        const getY = (val: number) => height - ((val / maxVal) * (height - padding * 2) + padding);

        // Generate Y-axis labels (4 steps)
        const yLabels = [0, Math.floor(maxVal * 0.33), Math.floor(maxVal * 0.66), maxVal];

        // Revenue (now Engagement) Line - Cubic Bezier
        let revPath = `M ${getX(0)},${getY(data[0].interactions)}`;
        let revArea = `M ${getX(0)},${height} L ${getX(0)},${getY(data[0].interactions)}`;

        for (let i = 0; i < data.length - 1; i++) {
            const x1 = getX(i);
            const y1 = getY(data[i].interactions);
            const x2 = getX(i + 1);
            const y2 = getY(data[i + 1].interactions);
            const cp1x = x1 + (x2 - x1) / 3;
            const cp2x = x1 + (2 * (x2 - x1)) / 3;
            revPath += ` C ${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}`;
            revArea += ` C ${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}`;
        }
        revArea += ` L ${getX(data.length - 1)},${height} Z`;

        // Visits Line (Thicker Dashed)
        let visPath = `M ${getX(0)},${getY(data[0].visits)}`;
        for (let i = 0; i < data.length - 1; i++) {
            const x1 = getX(i);
            const y1 = getY(data[i].visits);
            const x2 = getX(i + 1);
            const y2 = getY(data[i + 1].visits);
            visPath += ` L ${x2},${y2}`;
        }

        return { revenuePath: revPath, visitsPath: visPath, revenueArea: revArea, yLabels, getY };
    }, [data, hasData]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '340px', padding: '20px 0' }}>
            {/* Legend & Context */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'hsl(var(--primary))', boxShadow: '0 0 10px hsl(var(--primary))' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }} className="text-foreground">Verified Engagement</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1.5px dashed hsl(var(--muted-foreground))', opacity: 0.6 }} />
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }} className="text-foreground">Daily Traffic</span>
                    </div>
                </div>
            </div>

            <svg viewBox="0 0 800 250" style={{ overflow: 'visible', width: '100%', height: '250px' }}>
                {!hasData ? (
                    <text x="400" y="125" textAnchor="middle" fill="hsl(var(--muted-foreground))" opacity="0.5">Establishing data connection...</text>
                ) : (
                    <>
                        <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Grid Lines */}
                        {chartPoints.yLabels.map((val, i) => (
                            <g key={i}>
                                <line
                                    x1="20"
                                    y1={chartPoints.getY(val)}
                                    x2="780"
                                    y2={chartPoints.getY(val)}
                                    stroke="hsl(var(--border))"
                                    strokeWidth="1"
                                    opacity="0.3"
                                />
                                <text
                                    x="10"
                                    y={chartPoints.getY(val) + 4}
                                    fontSize="10"
                                    fill="hsl(var(--muted-foreground))"
                                    opacity="0.7"
                                    textAnchor="end"
                                >
                                    {val}
                                </text>
                            </g>
                        ))}

                        {/* Interaction Area */}
                        <motion.path
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            d={chartPoints.revenueArea}
                            fill="url(#areaGrad)"
                        />

                        {/* Interaction Path */}
                        <motion.path
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            d={chartPoints.revenuePath}
                            stroke="hsl(var(--primary))"
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                            vectorEffect="non-scaling-stroke"
                        />

                        {/* Visits Path (Dashed) */}
                        <motion.path
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 0.4 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            d={chartPoints.visitsPath}
                            stroke="hsl(var(--foreground))"
                            strokeWidth="2"
                            strokeDasharray="6 4"
                            fill="none"
                            vectorEffect="non-scaling-stroke"
                        />

                        {/* Hover Overlay */}
                        {data.map((_, i) => (
                            <rect
                                key={i}
                                x={(i / (data.length - 1)) * 760 + 20 - 40}
                                y="0"
                                width="80"
                                height="250"
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        ))}

                        {/* Tooltip */}
                        <AnimatePresence>
                            {hoveredIndex !== null && (
                                <motion.g
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    style={{ pointerEvents: 'none' }}
                                >
                                    <line
                                        x1={(hoveredIndex / (data.length - 1)) * 760 + 20}
                                        y1="0"
                                        x2={(hoveredIndex / (data.length - 1)) * 760 + 20}
                                        y2="250"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth="1"
                                        strokeDasharray="4 2"
                                    />
                                    <foreignObject
                                        x={(hoveredIndex / (data.length - 1)) * 760 + 20 - 60}
                                        y="-70"
                                        width="120"
                                        height="70"
                                    >
                                        <div style={{
                                            background: 'hsl(var(--card))',
                                            backdropFilter: 'blur(8px)',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '12px',
                                            padding: '10px',
                                            fontSize: '11px',
                                            color: 'hsl(var(--foreground))',
                                            textAlign: 'center',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                                            borderTop: '3px solid hsl(var(--primary))'
                                        }}>
                                            <div style={{ opacity: 0.6, marginBottom: '4px', fontSize: '10px' }}>{new Date(data[hoveredIndex].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                            <div style={{ color: 'hsl(var(--primary))', fontWeight: 700, fontSize: '12px' }}>{data[hoveredIndex].interactions} Interactions</div>
                                            <div style={{ opacity: 0.8, marginTop: '2px' }}>{data[hoveredIndex].visits} Visits</div>
                                        </div>
                                    </foreignObject>
                                </motion.g>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </svg>
        </div>
    );
}
