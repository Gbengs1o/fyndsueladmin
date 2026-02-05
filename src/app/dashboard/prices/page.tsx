"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, MapPin, Fuel, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { NIGERIAN_STATES } from "@/lib/states";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
    scope: z.enum(["national", "state"]),
    state: z.string().optional(),
    brand: z.string().optional(),
    pms_price: z.string().optional(),
    ago_price: z.string().optional(),
    dpk_price: z.string().optional(),
    lpg_price: z.string().optional(),
});

interface StateStats {
    stationCount: number;
    currentPrices: {
        pms: number | null;
        ago: number | null;
        dpk: number | null;
        lpg: number | null;
    };
    stationsWithPrices: number;
}

export default function PriceControlPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [stateStats, setStateStats] = useState<StateStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            scope: "state",
            state: "Lagos",
            brand: "all",
            pms_price: "",
            ago_price: "",
            dpk_price: "",
            lpg_price: "",
        },
    });

    const scope = form.watch("scope");
    const selectedState = form.watch("state");

    // Fetch state statistics when state changes
    const fetchStateStats = useCallback(async (stateName: string) => {
        if (!stateName) return;

        setLoadingStats(true);
        try {
            const { data, error } = await supabase
                .from("stations")
                .select("official_price_pms, official_price_ago, official_price_dpk, official_price_lpg")
                .ilike("state", stateName);

            if (error) throw error;

            if (data && data.length > 0) {
                // Get the most common price (modal price) for each fuel type
                const pmsPrice = data.find(s => s.official_price_pms)?.official_price_pms || null;
                const agoPrice = data.find(s => s.official_price_ago)?.official_price_ago || null;
                const dpkPrice = data.find(s => s.official_price_dpk)?.official_price_dpk || null;
                const lpgPrice = data.find(s => s.official_price_lpg)?.official_price_lpg || null;

                setStateStats({
                    stationCount: data.length,
                    currentPrices: {
                        pms: pmsPrice,
                        ago: agoPrice,
                        dpk: dpkPrice,
                        lpg: lpgPrice,
                    },
                    stationsWithPrices: data.filter(s => s.official_price_pms).length,
                });
            } else {
                setStateStats({
                    stationCount: 0,
                    currentPrices: { pms: null, ago: null, dpk: null, lpg: null },
                    stationsWithPrices: 0,
                });
            }
        } catch (error) {
            console.error("Failed to fetch state stats:", error);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        if (scope === "state" && selectedState) {
            fetchStateStats(selectedState);
        } else {
            setStateStats(null);
        }
    }, [scope, selectedState, fetchStateStats]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            // Use UPSERT to the new official_prices table (instant!)
            // The database trigger will sync to stations in the background
            const { error } = await supabase
                .from('official_prices')
                .upsert({
                    state: values.scope === 'national' ? 'National' : values.state,
                    brand: values.brand || 'all',
                    pms_price: values.pms_price ? Number(values.pms_price) : null,
                    ago_price: values.ago_price ? Number(values.ago_price) : null,
                    dpk_price: values.dpk_price ? Number(values.dpk_price) : null,
                    lpg_price: values.lpg_price ? Number(values.lpg_price) : null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'state,brand'
                });

            if (error) throw error;

            // Log to price_updates_log for audit trail
            await supabase.from('price_updates_log').insert({
                scope: values.scope,
                state: values.state || null,
                brand: values.brand || 'all',
                pms_price: values.pms_price ? Number(values.pms_price) : null,
                ago_price: values.ago_price ? Number(values.ago_price) : null,
                dpk_price: values.dpk_price ? Number(values.dpk_price) : null,
                lpg_price: values.lpg_price ? Number(values.lpg_price) : null,
                affected_count: null, // Trigger handles the actual count
            });

            toast({
                title: "Prices Updated",
                description: `Official prices saved. Syncing to stations in background.`,
            });

            // Refresh state stats after update
            if (values.scope === "state" && values.state) {
                fetchStateStats(values.state);
            }

            // Clear inputs
            form.setValue("pms_price", "");
            form.setValue("ago_price", "");
            form.setValue("dpk_price", "");
            form.setValue("lpg_price", "");

        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "Could not update prices.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Official Price Control</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Set Official Prices</CardTitle>
                        <CardDescription>
                            Set the government-approved or official pump prices. These values will override user reports in the app and appear with a verified badge.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                {/* Scope Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="scope"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Scope</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select scope" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="state">Specific State</SelectItem>
                                                        <SelectItem value="national">National (All Nigeria)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {scope === "state" && (
                                        <FormField
                                            control={form.control}
                                            name="state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>State</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select state" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {NIGERIAN_STATES.map((state) => (
                                                                <SelectItem key={state} value={state}>
                                                                    {state}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>

                                <FormField
                                    control={form.control}
                                    name="brand"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Brand Filter (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="All Brands" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="all">All Brands</SelectItem>
                                                    <SelectItem value="nnpc">NNPC</SelectItem>
                                                    <SelectItem value="total">TotalEnergies</SelectItem>
                                                    <SelectItem value="oando">Oando</SelectItem>
                                                    <SelectItem value="conoil">Conoil</SelectItem>
                                                    <SelectItem value="mrs">MRS</SelectItem>
                                                    <SelectItem value="mobil">11Plc (Mobil)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="pms_price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PMS (Petrol) Price (₦)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 950" {...field} type="number" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="ago_price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>AGO (Diesel) Price (₦)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 1100" {...field} type="number" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dpk_price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>DPK (Kerosene) Price (₦)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 1200" {...field} type="number" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lpg_price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>LPG (Gas) Price (₦/kg)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 1300" {...field} type="number" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Update Official Prices
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <div className="col-span-3 space-y-4">
                    {/* State Statistics Card - Only show when state is selected */}
                    {scope === "state" && stateStats && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    {selectedState} Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {loadingStats ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading statistics...
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="rounded-lg bg-background p-3 border">
                                                <p className="text-2xl font-bold text-primary">{stateStats.stationCount}</p>
                                                <p className="text-xs text-muted-foreground">Total Stations</p>
                                            </div>
                                            <div className="rounded-lg bg-background p-3 border">
                                                <p className="text-2xl font-bold text-green-600">{stateStats.stationsWithPrices}</p>
                                                <p className="text-xs text-muted-foreground">Have Official Price</p>
                                            </div>
                                        </div>

                                        {/* Current Prices */}
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <Fuel className="h-4 w-4" />
                                                Current State Prices
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex justify-between p-2 rounded bg-background border">
                                                    <span className="text-muted-foreground">PMS</span>
                                                    <span className="font-medium">
                                                        {stateStats.currentPrices.pms ? `₦${stateStats.currentPrices.pms}` : "Not set"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between p-2 rounded bg-background border">
                                                    <span className="text-muted-foreground">AGO</span>
                                                    <span className="font-medium">
                                                        {stateStats.currentPrices.ago ? `₦${stateStats.currentPrices.ago}` : "Not set"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between p-2 rounded bg-background border">
                                                    <span className="text-muted-foreground">DPK</span>
                                                    <span className="font-medium">
                                                        {stateStats.currentPrices.dpk ? `₦${stateStats.currentPrices.dpk}` : "Not set"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between p-2 rounded bg-background border">
                                                    <span className="text-muted-foreground">LPG</span>
                                                    <span className="font-medium">
                                                        {stateStats.currentPrices.lpg ? `₦${stateStats.currentPrices.lpg}/kg` : "Not set"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {stateStats.stationsWithPrices === 0 && (
                                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-amber-600">No default prices set</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Users in {selectedState} will see "No Price" until you set defaults.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>How it Works</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Use this tool to broadcast official prices to thousands of users instantly.
                            </p>
                            <div className="flex items-start gap-2">
                                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                                <div>
                                    <p className="text-sm font-medium">Verified Badge</p>
                                    <p className="text-xs text-muted-foreground">Stations with official prices appear with a green checkmark in the app.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                                <div>
                                    <p className="text-sm font-medium">State-Level Targeting</p>
                                    <p className="text-xs text-muted-foreground">Prices can be set specific to a state. Only stations in that state will be updated.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                                <div>
                                    <p className="text-sm font-medium">Cold Start Solution</p>
                                    <p className="text-xs text-muted-foreground">Set default prices so new users see data immediately, even without crowd reports.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>


            {/* Recent Updates Log */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Price Updates</CardTitle>
                    <CardDescription>History of official price changes made by admins.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PriceUpdatesTable />
                </CardContent>
            </Card>
        </div >
    );
}

function PriceUpdatesTable() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("price_updates_log")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) setLogs(data);
        setLoading(false);
    };

    // Expose fetchLogs to parent if needed, or just poll/refresh manually.
    // For now, simpler to just load on mount. 
    // Ideally, we lift this state up or use a context, but let's keep it simple.

    // Actually, to make the list update when the form submits, we should probably 
    // lift the state or use a trigger. 
    // Let's implement a simple refresh button for now to avoid refactoring the whole page.

    useEffect(() => {
        fetchLogs();
    }, []);

    if (loading) return <div className="text-sm text-muted-foreground p-4">Loading history...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                    Refresh Log
                </Button>
            </div>
            <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="p-3 font-medium">Time</th>
                            <th className="p-3 font-medium">Scope</th>
                            <th className="p-3 font-medium">Detail</th>
                            <th className="p-3 font-medium">Prices Set (₦)</th>
                            <th className="p-3 font-medium text-right">Affected</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="p-3 capitalize">{log.scope}</td>
                                <td className="p-3">
                                    {log.scope === 'state' ? log.state : 'National'}
                                    {log.brand && log.brand !== 'all' && <span className="text-muted-foreground ml-1">({log.brand})</span>}
                                </td>
                                <td className="p-3 space-x-2">
                                    {log.pms_price && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">PMS: {log.pms_price}</span>}
                                    {log.ago_price && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">AGO: {log.ago_price}</span>}
                                    {log.dpk_price && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">DPK: {log.dpk_price}</span>}
                                    {log.lpg_price && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">LPG: {log.lpg_price}</span>}
                                </td>
                                <td className="p-3 text-right">{log.affected_count}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">No updates found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
