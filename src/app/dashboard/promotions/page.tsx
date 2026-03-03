'use client';

import { useState, useEffect } from 'react';
import {
    getPromotionTiers,
    updatePromotionTier,
    PromotionTier
} from './actions';
import { useToast } from '@/hooks/use-toast';
import {
    Plus,
    Pencil,
    Trash2,
    Zap,
    Clock,
    Tag,
    Check,
    Loader2
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PromotionsPage() {
    const [tiers, setTiers] = useState<PromotionTier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<PromotionTier | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState<Partial<PromotionTier>>({
        name: '',
        price: 0,
        duration_hours: 0,
        description: '',
    });

    useEffect(() => {
        fetchTiers();
    }, []);

    const fetchTiers = async () => {
        setIsLoading(true);
        try {
            const data = await getPromotionTiers();
            setTiers(data);
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

    const handleEdit = (tier: PromotionTier) => {
        setEditingTier(tier);
        setFormData({
            name: tier.name,
            price: tier.price,
            duration_hours: tier.duration_hours,
            description: tier.description,
        });
        setIsEditModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingTier) return;
        setIsSaving(true);
        try {
            await updatePromotionTier(editingTier.id, formData);
            toast({
                title: 'Success',
                description: 'Promotion tier updated successfully',
            });
            setIsEditModalOpen(false);
            fetchTiers();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Zap className="h-8 w-8 text-primary fill-primary/10" />
                        Manage Promotion Tiers
                    </h1>
                    <p className="text-muted-foreground">Adjust pricing and details for fuel station boosts</p>
                </div>
            </div>

            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Promotion Tiers</CardTitle>
                    <CardDescription>Available promotion types for station managers</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tier Name</TableHead>
                                <TableHead>Price (₦)</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : tiers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No promotion tiers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tiers
                                    .filter(t => ['Quick Boost', 'Flash Sale', 'Area Takeover'].includes(t.name))
                                    .map((tier) => (
                                        <TableRow key={tier.id} className="group transition-colors hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                                        {tier.name}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-primary">
                                                ₦{tier.price.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {tier.duration_hours} hours
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate text-sm">
                                                {tier.description}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(tier)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Pencil className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Promotion Tier</DialogTitle>
                        <DialogDescription>
                            Modify the details for the <span className="font-bold text-primary">{editingTier?.name}</span> tier.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price">Price (₦)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                                <Input
                                    id="price"
                                    type="number"
                                    className="pl-7"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="duration">Duration (Hours)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={formData.duration_hours}
                                onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description/Tagline</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Explain what this boost does..."
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
