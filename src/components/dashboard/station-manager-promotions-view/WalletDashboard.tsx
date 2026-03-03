'use client';

import { useState } from 'react';
import { Wallet, Plus, RefreshCw, Loader2, Minus, History, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { adminCreditWallet } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface WalletDashboardProps {
    managerId: string;
    wallet: any;
    transactions: any[];
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export default function WalletDashboard({ managerId, wallet, transactions, onRefresh, isRefreshing }: WalletDashboardProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [amount, setAmount] = useState('2000');
    const [actionType, setActionType] = useState<'credit' | 'debit'>('credit');

    const handleAdjustBalance = async () => {
        const val = parseInt(amount);
        if (isNaN(val) || val <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid Amount",
                description: "Please select a valid amount for adjustment."
            });
            return;
        }

        const adjustment = actionType === 'credit' ? val : -val;

        // Prevent negative balance if debiting
        if (actionType === 'debit' && (wallet?.balance || 0) < val) {
            toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: "The manager's wallet has insufficient balance for this debit."
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await adminCreditWallet(managerId, adjustment);
            if (result.success) {
                toast({
                    title: "Success",
                    description: `Successfully ${actionType === 'credit' ? 'credited' : 'debited'} ₦${val.toLocaleString()} to manager's wallet.`
                });
                if (onRefresh) onRefresh();
            }
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || 'Failed to adjust balance'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-gradient-to-br from-primary to-primary/80 shadow-xl text-white overflow-hidden relative group">
                {/* Decorative Elements */}
                <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-white/5 rounded-full blur-2xl" />

                <CardHeader className="relative z-10 pb-2">
                    <div className="flex justify-between items-center opacity-90">
                        <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3" />
                            Manager Promotional Wallet
                        </span>
                        <Wallet className="h-5 w-5 opacity-50" />
                    </div>
                    <CardTitle className="text-4xl font-black mt-2">
                        ₦{wallet?.balance?.toLocaleString() || '0'}
                    </CardTitle>
                    <CardDescription className="text-white/60 font-medium text-xs">
                        Current balance available for promotion activations.
                    </CardDescription>
                </CardHeader>

                <CardContent className="relative z-10 pt-4 space-y-4">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 space-y-3 backdrop-blur-sm">
                        <p className="text-[10px] uppercase font-black text-white/50 tracking-widest leading-none">Admin Manual Adjustment</p>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select value={actionType} onValueChange={(v: any) => setActionType(v)}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl h-10 ring-0 focus:ring-0">
                                        <SelectValue placeholder="Action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="credit">Credit (+)</SelectItem>
                                        <SelectItem value="debit">Debit (-)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-[1.5]">
                                <Select value={amount} onValueChange={(v) => setAmount(v)}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl h-10 ring-0 focus:ring-0">
                                        <SelectValue placeholder="Amount" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000">₦1,000</SelectItem>
                                        <SelectItem value="2000">₦2,000</SelectItem>
                                        <SelectItem value="5000">₦5,000</SelectItem>
                                        <SelectItem value="10000">₦10,000</SelectItem>
                                        <SelectItem value="20000">₦20,000</SelectItem>
                                        <SelectItem value="50000">₦50,000</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            className={`w-full h-11 rounded-xl font-bold transition-all shadow-lg ${actionType === 'credit'
                                    ? 'bg-white text-primary hover:bg-white/90 shadow-white/10'
                                    : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                                }`}
                            onClick={handleAdjustBalance}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : (actionType === 'credit' ? <><Plus className="h-4 w-4 mr-1" /> Apply Credit</> : <><Minus className="h-4 w-4 mr-1" /> Apply Debit</>)}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border shadow-sm flex flex-col">
                <CardHeader className="pb-2 border-b">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base font-black uppercase tracking-wider">Transaction History</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="h-8 w-8 rounded-lg"
                        >
                            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <div className="divide-y max-h-[280px] overflow-y-auto">
                        {transactions.length > 0 ? (
                            transactions.map((tx) => (
                                <div key={tx.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold">
                                            {tx.type === 'deposit'
                                                ? (tx.metadata?.method === 'admin_credit' ? 'Admin Credited' : 'Wallet Top-up')
                                                : (tx.metadata?.method === 'admin_credit' ? 'Admin Debited' : tx.metadata?.promotion_tier || 'Spent on Promotion')}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/30 font-bold uppercase">
                                                {tx.id.slice(0, 8)}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground font-medium">{new Date(tx.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-black ${tx.type === 'deposit' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {tx.type === 'deposit' ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center gap-2 opacity-30">
                                <AlertCircle className="h-8 w-8" />
                                <p className="text-xs font-bold uppercase tracking-widest">No activities</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
