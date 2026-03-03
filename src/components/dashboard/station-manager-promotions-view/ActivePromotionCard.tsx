'use client';

import { useState, useEffect } from 'react';
import { Flame, Clock, Zap, Crown, MousePointer2, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface ActivePromotionCardProps {
    promotion: any;
}

export default function ActivePromotionCard({ promotion }: ActivePromotionCardProps) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTime = () => {
            const end = new Date(promotion.end_time).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${h}h ${m}m remaining`);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 60000);
        return () => clearInterval(interval);
    }, [promotion.end_time]);

    const getColors = () => {
        const name = promotion.tier?.name || '';
        if (name.includes('Quick')) return { icon: <Flame className="h-5 w-5" />, color: 'text-amber-500', bg: 'bg-amber-100', accent: 'border-amber-200' };
        if (name.includes('Area')) return { icon: <Zap className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-100', accent: 'border-emerald-200' };
        return { icon: <Crown className="h-5 w-5" />, color: 'text-purple-500', bg: 'bg-purple-100', accent: 'border-purple-200' };
    };

    const { icon, color, bg, accent } = getColors();
    const ctr = promotion.views > 0 ? ((promotion.clicks || 0) / promotion.views * 100).toFixed(1) : '0';

    return (
        <div className={`p-5 rounded-2xl space-y-4 relative overflow-hidden transition-all hover:shadow-md border ${accent} bg-white/50 backdrop-blur-sm`}>
            {/* Header info */}
            <div className="flex items-center gap-3 relative z-10">
                <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground leading-none mb-1">Boost Active</p>
                    <h3 className="text-lg font-black leading-none">{promotion.tier?.name || 'Campaign'}</h3>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="p-3 bg-muted/40 rounded-xl border border-white/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Eye className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Reach</span>
                    </div>
                    <p className="text-xl font-black">{promotion.views?.toLocaleString() || '0'}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-white/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <MousePointer2 className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Clicks</span>
                    </div>
                    <p className="text-xl font-black">{promotion.clicks?.toLocaleString() || '0'}</p>
                </div>
            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-4 border-t border-muted/50 relative z-10">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary">{timeLeft}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{ctr}% CTR</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>

            {/* Decorative background circles */}
            <div className="absolute top-[-10px] right-[-10px] w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
            <div className="absolute bottom-[-10px] left-[-10px] w-16 h-16 bg-muted rounded-full blur-xl opacity-20" />
        </div>
    );
}
