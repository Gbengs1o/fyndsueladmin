"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save } from "lucide-react"

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
    const [isUpdating, setIsUpdating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();

    // Form states
    const [formData, setFormData] = useState({
        pms: "",
        ago: "",
        dpk: "",
        lpg: ""
    });

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
                    setFormData({
                        pms: data.pms_price?.toString() || "",
                        ago: data.ago_price?.toString() || "",
                        dpk: data.dpk_price?.toString() || "",
                        lpg: data.lpg_price?.toString() || ""
                    });
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
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1 text-center">{label}</span>
            {loading ? (
                <Skeleton className="h-6 w-16" />
            ) : (
                <div className={`text-lg font-bold ${colorClass}`}>
                    {price ? `₦${price.toLocaleString()}` : 'N/A'}
                </div>
            )}
        </div>
    );

    const handleUpdatePrices = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);

        try {
            const { error } = await supabase
                .from('official_prices')
                .upsert({
                    state: 'National',
                    brand: 'all',
                    pms_price: formData.pms ? Number(formData.pms) : null,
                    ago_price: formData.ago ? Number(formData.ago) : null,
                    dpk_price: formData.dpk ? Number(formData.dpk) : null,
                    lpg_price: formData.lpg ? Number(formData.lpg) : null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'state,brand'
                });

            if (error) throw error;

            // Log entry
            await supabase.from('price_updates_log').insert({
                scope: 'national',
                state: 'National',
                brand: 'all',
                pms_price: formData.pms ? Number(formData.pms) : null,
                ago_price: formData.ago ? Number(formData.ago) : null,
                dpk_price: formData.dpk ? Number(formData.dpk) : null,
                lpg_price: formData.lpg ? Number(formData.lpg) : null,
                affected_count: 0,
            });

            toast({
                title: "National Prices Updated",
                description: "Official benchmarks have been updated successfully.",
            });

            setIsModalOpen(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "Could not update prices.",
            });
        } finally {
            setIsUpdating(false);
        }
    };

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
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                                <Edit className="h-3.5 w-3.5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Update National Prices</DialogTitle>
                                <DialogDescription>
                                    Set the official benchmark prices for Nigeria. These values update the dashboard widget and app benchmarks instantly.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdatePrices} className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pms">PMS (Petrol)</Label>
                                        <Input 
                                            id="pms" 
                                            type="number" 
                                            placeholder="e.g. 988" 
                                            value={formData.pms}
                                            onChange={(e) => setFormData({...formData, pms: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ago">AGO (Diesel)</Label>
                                        <Input 
                                            id="ago" 
                                            type="number" 
                                            placeholder="e.g. 1100" 
                                            value={formData.ago}
                                            onChange={(e) => setFormData({...formData, ago: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dpk">DPK (Kero)</Label>
                                        <Input 
                                            id="dpk" 
                                            type="number" 
                                            placeholder="e.g. 1200" 
                                            value={formData.dpk}
                                            onChange={(e) => setFormData({...formData, dpk: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lpg">LPG (Gas)</Label>
                                        <Input 
                                            id="lpg" 
                                            type="number" 
                                            placeholder="e.g. 1300" 
                                            value={formData.lpg}
                                            onChange={(e) => setFormData({...formData, lpg: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button type="submit" disabled={isUpdating} className="w-full">
                                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Update Benchmarks
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
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
