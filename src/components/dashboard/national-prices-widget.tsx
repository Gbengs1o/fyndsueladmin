"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PriceData {
    pms_price: number | null;
    ago_price: number | null;
    dpk_price: number | null;
    lpg_price: number | null;
    updated_at: string;
}

export function NationalPricesWidget() {
    const [prices, setPrices] = useState<PriceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNationalPrices = async () => {
            try {
                const { data, error } = await supabase
                    .from('official_prices')
                    .select('*')
                    .eq('state', 'National')
                    .eq('brand', 'all')
                    .single();

                if (data) {
                    setPrices(data);
                }
            } catch (error) {
                console.error("Error fetching national prices:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNationalPrices();

        // Subscribe to changes on this specific row
        const channel = supabase
            .channel('national-prices')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'official_prices', filter: "state=eq.National" },
                (payload) => {
                    setPrices(payload.new as PriceData);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const PriceItem = ({ label, price, colorClass }: { label: string, price: number | null, colorClass: string }) => (
        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</span>
            {loading ? (
                <Skeleton className="h-6 w-16" />
            ) : (
                <div className={`text-xl font-bold ${colorClass}`}>
                    {price ? `₦${price.toLocaleString()}` : 'N/A'}
                </div>
            )}
        </div>
    );

    return (
        <Card className="animate-fade-in-up border-primary/20 shadow-sm" style={{ animationDelay: '50ms' }}>
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                            Official National Prices
                        </CardTitle>
                    </div>
                    <Link href="/dashboard/prices">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                            <Edit className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <PriceItem label="PMS (Petrol)" price={prices?.pms_price || null} colorClass="text-foreground" />
                    <PriceItem label="AGO (Diesel)" price={prices?.ago_price || null} colorClass="text-foreground" />
                    <PriceItem label="DPK (Kero)" price={prices?.dpk_price || null} colorClass="text-foreground" />
                    <PriceItem label="LPG (Gas)" price={prices?.lpg_price || null} colorClass="text-foreground" />
                </div>
            </CardContent>
        </Card>
    );
}
