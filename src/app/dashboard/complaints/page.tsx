'use client';

import { useState, useEffect } from 'react';
import {
    getComplaints,
    dismissComplaint,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import {
    AlertTriangle,
    Eye,
    Trash2,
    Calendar,
    Fuel,
    User,
    MapPin,
    Info,
    Loader2,
    RefreshCw
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ComplaintsPage() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
    const [isDismissing, setIsDismissing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        setIsLoading(true);
        try {
            const data = await getComplaints();
            setComplaints(data);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = (complaint: any) => {
        setSelectedComplaint(complaint);
        setIsDetailModalOpen(true);
    };

    const handleDismiss = async (id: string) => {
        if (!confirm('Are you sure you want to dismiss this complaint?')) return;

        setIsDismissing(true);
        try {
            await dismissComplaint(id);
            toast({
                title: 'Success',
                description: 'Complaint dismissed successfully',
            });
            setIsDetailModalOpen(false);
            fetchComplaints();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        } finally {
            setIsDismissing(false);
        }
    };

    const renderSnapshot = (snapshot: any) => {
        if (!snapshot) return <p className="text-muted-foreground italic">No snapshot available</p>;

        return (
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-xl border border-dashed">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Snapshot Prices</p>
                    <div className="space-y-0.5">
                        <p className="font-bold flex justify-between">PMS: <span className="text-primary">₦{snapshot?.prices?.PMS || 'N/A'}</span></p>
                        <p className="font-bold flex justify-between">AGO: <span className="text-primary">₦{snapshot?.prices?.AGO || 'N/A'}</span></p>
                        <p className="font-bold flex justify-between">DPK: <span className="text-primary">₦{snapshot?.prices?.DPK || 'N/A'}</span></p>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Station Meta</p>
                    <div className="space-y-0.5 text-xs">
                        <p className="flex justify-between">Brand: <span className="font-medium">{snapshot?.brand || 'N/A'}</span></p>
                        <p className="flex justify-between">Verified: <span className="font-medium">{snapshot?.is_verified ? 'Yes' : 'No'}</span></p>
                        <p className="flex justify-between">Location: <span className="font-medium truncate max-w-[80px]">{snapshot?.coords ? 'Set' : 'No'}</span></p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 py-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-destructive fill-destructive/10" />
                        Station Complaints
                    </h1>
                    <p className="text-muted-foreground">Monitor and manage user-reported issues for fuel stations</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchComplaints} disabled={isLoading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-muted/30">
                    <CardTitle>Recent Complaints</CardTitle>
                    <CardDescription>View reports submitted by mobile app users</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[200px]">Station</TableHead>
                                <TableHead className="w-[150px]">Reporter</TableHead>
                                <TableHead>Complaint Message</TableHead>
                                <TableHead className="w-[180px]">Date Reported</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                            <p className="text-sm font-medium">Loading complaints...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : complaints.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Info className="h-8 w-8 opacity-20" />
                                            <p className="text-sm">No complaints found. Good job!</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                complaints.map((item) => (
                                    <TableRow key={item.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleViewDetails(item)}>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-sm tracking-tight">{item.stations?.name}</span>
                                                <Badge variant="outline" className="text-[9px] w-fit py-0 px-1 uppercase font-black opacity-70">
                                                    {item.stations?.brand}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs font-semibold">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                                                    {item.profiles?.full_name?.charAt(0) || 'U'}
                                                </div>
                                                {item.profiles?.full_name || 'Legacy User'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm text-muted-foreground max-w-[400px] truncate">
                                                {item.complaint}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs font-medium">
                                                <span>{format(new Date(item.created_at), 'PPP')}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(item.created_at), 'p')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="sm:max-w-[550px] overflow-hidden rounded-3xl p-0 border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-gradient-to-br from-destructive/10 via-background to-background border-b relative">
                        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-destructive/5 rounded-full blur-3xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black tracking-tight">Complaint Details</DialogTitle>
                                <DialogDescription className="text-sm font-medium"> Review the report and station state at time of submission. </DialogDescription>
                            </div>
                            <div className="h-12 w-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                                        <Fuel className="h-3 w-3" /> Station
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-lg leading-none">{selectedComplaint?.stations?.name}</p>
                                        <Badge variant="outline" className="text-[9px] font-bold">{selectedComplaint?.stations?.brand}</Badge>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                                        <User className="h-3 w-3" /> Reported By
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-lg leading-none">{selectedComplaint?.profiles?.full_name || 'Legacy User'}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {selectedComplaint && format(new Date(selectedComplaint.created_at), 'PPP p')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                                    <Info className="h-3 w-3" /> Complaint Message
                                </div>
                                <div className="p-4 rounded-2xl bg-muted border font-medium text-sm leading-relaxed">
                                    {selectedComplaint?.complaint}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                                    <MapPin className="h-3 w-3" /> Station Snapshot (At time of report)
                                </div>
                                {renderSnapshot(selectedComplaint?.station_snapshot)}
                                <p className="text-[10px] text-muted-foreground italic font-medium">
                                    Compare these snapshot prices against live prices to verify the report status.
                                </p>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-muted/30 border-t flex-row justify-between items-center sm:justify-between">
                        <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl font-bold">
                            Close
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="destructive"
                                onClick={() => handleDismiss(selectedComplaint?.id)}
                                disabled={isDismissing}
                                className="rounded-xl font-black shadow-lg shadow-destructive/20"
                            >
                                {isDismissing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                Dismiss Complaint
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
