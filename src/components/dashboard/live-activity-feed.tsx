"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, Fuel, MapPin, User, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
    id: string;
    type: 'report' | 'station' | 'user';
    title: string;
    description: string;
    timestamp: string;
    user?: {
        name: string;
        avatar_url?: string;
    };
    meta?: any;
}

export function LiveActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial fetch of recent activities
        const fetchRecent = async () => {
            try {
                // 1. Recent Price Reports
                const { data: reports } = await supabase
                    .from('price_reports')
                    .select(`
                        id, 
                        fuel_type, 
                        price, 
                        created_at, 
                        profiles(full_name, avatar_url),
                        stations(name, state)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(5);

                // 2. Recent Stations
                const { data: stations } = await supabase
                    .from('stations')
                    .select(`
                        id, 
                        name, 
                        state, 
                        created_at,
                        added_by
                    `)
                    .order('created_at', { ascending: false })
                    .limit(3);

                const initialActivities: ActivityItem[] = [];

                reports?.forEach((r: any) => {
                    initialActivities.push({
                        id: `report-${r.id}`,
                        type: 'report',
                        title: `New Price Report`,
                        description: `${r.fuel_type} @ ₦${r.price} - ${r.stations?.name}, ${r.stations?.state}`,
                        timestamp: r.created_at,
                        user: {
                            name: r.profiles?.full_name || 'Anonymous',
                            avatar_url: r.profiles?.avatar_url
                        }
                    });
                });

                stations?.forEach((s: any) => {
                    initialActivities.push({
                        id: `station-${s.id}`,
                        type: 'station',
                        title: `New Station Added`,
                        description: `${s.name} in ${s.state}`,
                        timestamp: s.created_at,
                        user: { name: 'System' } // simplified for now
                    });
                });

                // Sort and set
                initialActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setActivities(initialActivities.slice(0, 10));

            } catch (e) {
                console.error("Error fetching activities", e);
            } finally {
                setLoading(false);
            }
        };

        fetchRecent();

        // Realtime Subscription
        const channel = supabase
            .channel('dashboard-feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'price_reports' },
                async (payload) => {
                    // Fetch details for the new report (we need relations)
                    const { data: r } = await supabase
                        .from('price_reports')
                        .select(`
                            id, fuel_type, price, created_at, 
                            profiles(full_name, avatar_url),
                            stations(name, state)
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (r) {
                        const newActivity: ActivityItem = {
                            id: `report-${r.id}`,
                            type: 'report',
                            title: `New Price Report`,
                            description: `${r.fuel_type} @ ₦${r.price} - ${r.stations?.name}`,
                            timestamp: r.created_at,
                            user: {
                                name: r.profiles?.full_name || 'Anonymous',
                                avatar_url: r.profiles?.avatar_url
                            }
                        };
                        setActivities(prev => [newActivity, ...prev].slice(0, 20)); // Keep last 20
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <Card className="col-span-1 h-full flex flex-col animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        Live Activity
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal animate-pulse text-emerald-600 border-emerald-200 bg-emerald-50">
                        Live
                    </Badge>
                </div>
                <CardDescription>Real-time updates across the platform</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                {loading ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ScrollArea className="h-[350px]">
                        <div className="flex flex-col">
                            {activities.length > 0 ? activities.map((item, i) => (
                                <div key={item.id} className={`flex gap-3 p-4 hover:bg-muted/30 transition-colors ${i !== activities.length - 1 ? 'border-b border-border/50' : ''}`}>
                                    <div className="mt-1">
                                        {item.type === 'report' ? (
                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <Fuel className="h-4 w-4" />
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium leading-none">{item.title}</p>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                            {item.description}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={item.user?.avatar_url} />
                                                <AvatarFallback className="text-[8px]">
                                                    {item.user?.name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] text-muted-foreground">
                                                {item.user?.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No recent activity
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
