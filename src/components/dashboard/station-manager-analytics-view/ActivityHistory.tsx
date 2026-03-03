'use client';

import React from 'react';
import { MessageSquare, Zap, Target, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityItem {
    type: 'report' | 'review' | 'price_log';
    created_at: string;
    description: string;
}

export default function ActivityHistory({ activities }: { activities: ActivityItem[] }) {
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border min-h-[200px]">
                <Calendar size={40} className="opacity-20 mb-4" />
                <p className="text-muted-foreground">No recent activity detected.</p>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'report': return <Target size={16} />;
            case 'review': return <MessageSquare size={16} />;
            case 'price_log': return <Zap size={16} />;
            default: return <Calendar size={16} />;
        }
    };

    const getColorClass = (type: string) => {
        switch (type) {
            case 'report': return 'text-green-500 bg-green-500/10';
            case 'review': return 'text-purple-500 bg-purple-500/10';
            case 'price_log': return 'text-orange-500 bg-orange-500/10';
            default: return 'text-primary bg-primary/10';
        }
    };

    return (
        <div className="flex flex-col gap-0 w-full">
            {activities.slice(0, 5).map((activity, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4 py-4 relative border-b last:border-0"
                >
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getColorClass(activity.type)}`}
                    >
                        {getIcon(activity.type)}
                    </div>
                    <div>
                        <p className="text-sm font-medium m-0">
                            {activity.description}
                        </p>
                        <span className="text-xs text-muted-foreground opacity-80">
                            {new Date(activity.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                </motion.div>
            ))}
            {activities.length > 5 && (
                <p className="text-xs text-muted-foreground text-center mt-3 opacity-60">
                    + {activities.length - 5} more recent events
                </p>
            )}
        </div>
    );
}
