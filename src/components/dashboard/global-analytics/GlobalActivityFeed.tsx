'use client';

import React from 'react';
import { FileText, UserPlus, MapPin, Activity, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GlobalActivityFeedProps {
    activities: {
        id: string;
        type: 'report' | 'new_user' | 'new_station' | 'flagged';
        created_at: string;
        description: string;
        user_id?: string;
        station_id?: string;
    }[];
}

export default function GlobalActivityFeed({ activities }: GlobalActivityFeedProps) {
    if (!activities || activities.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border border-dashed border-border mt-4">
                <Activity size={32} className="opacity-20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground m-0 text-center">No recent platform activity captured.</p>
            </div>
        );
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'report': return <FileText size={16} className="text-blue-500" />;
            case 'new_user': return <UserPlus size={16} className="text-emerald-500" />;
            case 'new_station': return <MapPin size={16} className="text-purple-500" />;
            case 'flagged': return <AlertTriangle size={16} className="text-orange-500" />;
            default: return <Activity size={16} className="text-muted-foreground" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'report': return 'bg-blue-500/10 border-blue-500/20';
            case 'new_user': return 'bg-emerald-500/10 border-emerald-500/20';
            case 'new_station': return 'bg-purple-500/10 border-purple-500/20';
            case 'flagged': return 'bg-orange-500/10 border-orange-500/20';
            default: return 'bg-muted border-border';
        }
    };

    return (
        <div className="flex-1 mt-4 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[400px]">
            {activities.map((activity, index) => (
                <div key={activity.id || index} className="flex gap-4 relative isolate">
                    {index !== activities.length - 1 && (
                        <div className="absolute top-8 bottom-[-16px] left-[15px] w-px bg-border -z-10" />
                    )}

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 flex-1 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-foreground">
                                {activity.type === 'report' && 'Price Update'}
                                {activity.type === 'new_user' && 'New Registration'}
                                {activity.type === 'new_station' && 'Station Added'}
                                {activity.type === 'flagged' && 'Content Flagged'}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground m-0 mt-1 leading-relaxed">
                            {activity.description}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
