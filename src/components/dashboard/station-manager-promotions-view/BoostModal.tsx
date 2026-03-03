'use client';

import { useState } from 'react';
import { Rocket, Zap, Crown, Check, AlertCircle, Loader2 } from 'lucide-react';
import { adminActivatePromotion } from './actions';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface BoostModalProps {
    isOpen: boolean;
    onClose: () => void;
    tiers: any[];
    walletBalance: number;
    managerId: string;
    stationId: number;
}

const TIER_ICONS: Record<string, any> = {
    'Quick Boost': <Rocket className="h-6 w-6" />,
    'Flash Sale': <Zap className="h-6 w-6" />,
    'Area Takeover': <Crown className="h-6 w-6" />,
};

const TIER_COLORS: Record<string, string> = {
    'Quick Boost': 'text-blue-500',
    'Flash Sale': 'text-amber-500',
    'Area Takeover': 'text-emerald-500',
};

export default function BoostModal({ isOpen, onClose, tiers, walletBalance, managerId, stationId }: BoostModalProps) {
    const { toast } = useToast();
    const [selectedTier, setSelectedTier] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleActivate = async () => {
        if (!selectedTier) return;
        if (walletBalance < selectedTier.price) {
            toast({
                variant: "destructive",
                title: "Insufficient Funds",
                description: "The manager's wallet has insufficient funds. Please add Admin Credit first."
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await adminActivatePromotion(managerId, stationId, selectedTier.id);
            if (result.success) {
                toast({
                    title: "Success",
                    description: `Promotion "${selectedTier.name}" activated successfully!`
                });
                onClose();
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Activation Failed",
                description: error.message || 'Failed to activate promotion'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <DialogHeader className="p-8 bg-gradient-to-br from-primary/10 via-background to-background border-b relative overflow-hidden">
                    <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black tracking-tight">Activate Boost</DialogTitle>
                            <DialogDescription className="text-sm font-medium">
                                select a campaign plan to enhance station visibility.
                            </DialogDescription>
                        </div>
                        <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <Rocket className="h-7 w-7 text-primary animate-pulse" />
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-8">
                    {/* Tiers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {tiers.map((tier) => (
                            <Card
                                key={tier.id}
                                className={`cursor-pointer transition-all border-2 relative overflow-hidden group ${selectedTier?.id === tier.id
                                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                        : 'hover:border-primary/50 bg-card'
                                    }`}
                                onClick={() => setSelectedTier(tier)}
                            >
                                <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                                    <div className={`p-2.5 rounded-xl mb-2 transition-transform group-hover:scale-110 ${selectedTier?.id === tier.id ? TIER_COLORS[tier.name] + ' bg-primary/10' : 'text-muted-foreground bg-muted'
                                        }`}>
                                        {TIER_ICONS[tier.name] || <Rocket className="h-6 w-6" />}
                                    </div>
                                    <h4 className="font-black text-sm">{tier.name}</h4>
                                    <p className="text-lg font-black tracking-tight">₦{tier.price.toLocaleString()}</p>
                                    <Badge variant="outline" className="text-[9px] py-0 font-bold uppercase tracking-widest">{tier.duration_hours}H</Badge>

                                    {selectedTier?.id === tier.id && (
                                        <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                                            <Check className="h-2 w-2 text-white" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Features & Balance info */}
                    <div className="space-y-4">
                        {selectedTier && (
                            <div className="p-5 rounded-2xl bg-muted/50 border border-dashed border-muted-foreground/20 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h5 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Standard features included:</h5>
                                <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                                    {selectedTier.features?.map((f: string, i: number) => (
                                        <li key={i} className="text-xs font-bold flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                            {f.replace(/_/g, ' ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-5 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 h-full w-1/3 bg-white/5 skew-x-[-20deg] group-hover:translate-x-4 transition-transform duration-700" />
                            <div className="relative z-10">
                                <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Manager Wallet Balance</p>
                                <p className="text-xl font-black">₦{walletBalance.toLocaleString()}</p>
                            </div>
                            <div className="relative z-10 text-right space-y-1">
                                {selectedTier && (
                                    <>
                                        <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Campaign Cost</p>
                                        <p className="text-xl font-black">₦{selectedTier.price.toLocaleString()}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {selectedTier && walletBalance < selectedTier.price && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p className="text-xs font-bold">Manager has insufficient funds for this boost. Add credit above.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-8 bg-muted/30 border-t">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl font-bold">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleActivate}
                        disabled={!selectedTier || isSubmitting || walletBalance < selectedTier.price}
                        className="rounded-xl px-8 font-black shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 min-w-[180px]"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
                        ) : (
                            "Activate on Behalf"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
