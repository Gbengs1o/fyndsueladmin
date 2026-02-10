"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
    CheckCircle,
    XCircle,
    MapPin,
    Phone,
    User as UserIcon,
    Loader2,
    Calendar,
    ExternalLink,
    AlertCircle
} from "lucide-react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ManagerProfile {
    id: string
    full_name: string
    phone_number: string
    station_id: number | null
    verification_status: 'pending' | 'verified' | 'rejected'
    verification_photo_url: string | null
    created_at: string
    stations?: {
        name: string
        address: string
        city: string
        state: string
    }
}

export default function ManagerRequestsPage() {
    const { isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const [requests, setRequests] = useState<ManagerProfile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Modal states
    const [selectedRequest, setSelectedRequest] = useState<ManagerProfile | null>(null)
    const [isPhotoOpen, setIsPhotoOpen] = useState(false)

    const fetchRequests = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('manager_profiles')
                .select(`
                  *,
                  stations (
                    name,
                    address,
                    state
                  )
                `)
                .eq('verification_status', 'pending')
                .order('created_at', { ascending: true }) // Oldest first

            if (error) throw error
            setRequests(data || [])
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    useEffect(() => {
        if (!authLoading) {
            fetchRequests()
        }
    }, [fetchRequests, authLoading])

    const handleAction = async (id: string, action: 'verified' | 'rejected') => {
        setProcessingId(id)
        try {
            const { error } = await supabase
                .from('manager_profiles')
                .update({ verification_status: action })
                .eq('id', id)

            if (error) throw error

            toast({
                title: action === 'verified' ? "Manager Approved" : "Request Rejected",
                description: `Successfully processed request.`
            })

            // Remove from list immediately
            setRequests(prev => prev.filter(r => r.id !== id))
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setProcessingId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 py-6 max-w-5xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Manager Requests</h1>
                <p className="text-muted-foreground">
                    Review and approve accounts requesting access to station management dashboards.
                </p>
            </div>

            {requests.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <CheckCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">All Caught Up!</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            There are no pending manager requests at the moment.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {requests.map((request) => (
                        <Card key={request.id} className="overflow-hidden border-l-4 border-l-amber-500">
                            <CardHeader className="bg-muted/40 pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base">{request.full_name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <Phone className="h-3 w-3" /> {request.phone_number}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                                        Pending Review
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6 py-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                            <MapPin className="h-4 w-4" /> Requested Station
                                        </h4>
                                        <div className="p-3 bg-card border rounded-lg">
                                            <p className="font-semibold">{request.stations?.name || 'Unknown Station'}</p>
                                            <p className="text-sm text-muted-foreground">{request.stations?.address}</p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="font-normal">
                                                    {request.stations?.city}, {request.stations?.state}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        Requested on {format(new Date(request.created_at), 'PPP at p')}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Verification Proof</h4>
                                    {request.verification_photo_url ? (
                                        <div
                                            className="relative aspect-video bg-black/5 rounded-lg border overflow-hidden group cursor-pointer"
                                            onClick={() => {
                                                setSelectedRequest(request)
                                                setIsPhotoOpen(true)
                                            }}
                                        >
                                            <img
                                                src={request.verification_photo_url}
                                                alt="Proof"
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white flex items-center gap-2 font-medium">
                                                    <ExternalLink className="h-4 w-4" /> View Full
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-32 flex flex-col items-center justify-center bg-muted/50 rounded-lg border border-dashed text-muted-foreground text-sm">
                                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                            No photo proof submitted
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/40 flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleAction(request.id, 'rejected')}
                                    disabled={!!processingId}
                                >
                                    {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                    Reject
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleAction(request.id, 'verified')}
                                    disabled={!!processingId}
                                >
                                    {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                    Approve Request
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Photo Dialog */}
            <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Verification Proof</DialogTitle>
                        <DialogDescription>
                            Submitted by {selectedRequest?.full_name} for {selectedRequest?.stations?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 text-center bg-black/5 rounded border p-1">
                        {selectedRequest?.verification_photo_url && (
                            <img
                                src={selectedRequest.verification_photo_url}
                                alt="Proof"
                                className="max-h-[70vh] w-auto mx-auto object-contain"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
