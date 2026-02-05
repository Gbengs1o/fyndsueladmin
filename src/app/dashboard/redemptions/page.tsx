"use client"

import { format } from "date-fns"
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Loader2,
    Wallet,
    XCircle
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

// --- Types ---
interface RedemptionRequest {
    id: number
    user_id: string
    amount_points: number
    amount_naira: number
    phone_number: string
    status: "pending" | "approved" | "rejected"
    created_at: string
    processed_at: string | null
    admin_note: string | null
    user?: {
        full_name: string
        email: string
    }
}

export default function RedemptionsPage() {
    const { toast } = useToast()

    // State
    const [requests, setRequests] = useState<RedemptionRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("pending")
    const [processDialogOpen, setProcessDialogOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<RedemptionRequest | null>(null)
    const [processStatus, setProcessStatus] = useState<"approved" | "rejected">("approved")
    const [adminNote, setAdminNote] = useState("")
    const [processing, setProcessing] = useState(false)

    // Fetch Requests
    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            // First get requests based on status
            let query = supabase
                .from("redemption_requests")
                .select(`
          *,
          user:profiles (full_name, email)
        `)
                .order("created_at", { ascending: false })

            if (activeTab !== "all") {
                query = query.eq("status", activeTab)
            }

            const { data, error } = await query

            if (error) throw error

            // Transform data to match interface (handling nested user object)
            const transformedData = (data || []).map(item => ({
                ...item,
                user: item.user // supabase returns user object directly if relation exists
            }))

            setRequests(transformedData as unknown as RedemptionRequest[])
        } catch (error) {
            console.error("Error fetching redemptions:", error)
            toast({
                title: "Error",
                description: "Failed to load redemption requests",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }, [activeTab, toast])

    useEffect(() => {
        fetchRequests()
    }, [fetchRequests])

    // Open Process Dialog
    const handleOpenProcessDialog = (request: RedemptionRequest, status: "approved" | "rejected") => {
        setSelectedRequest(request)
        setProcessStatus(status)
        setAdminNote("")
        setProcessDialogOpen(true)
    }

    // Submit Process
    const handleProcessRequest = async () => {
        if (!selectedRequest) return
        setProcessing(true)

        try {
            const { data, error } = await supabase.rpc("process_redemption_request", {
                p_request_id: selectedRequest.id,
                p_status: processStatus,
                p_admin_note: adminNote
            })

            if (error) throw error
            if (!data.success) throw new Error(data.message)

            toast({
                title: processStatus === "approved" ? "Request Approved" : "Request Rejected",
                description: data.message,
            })

            setProcessDialogOpen(false)
            fetchRequests() // Refresh list
        } catch (error: any) {
            console.error("Error processing request:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to process request",
                variant: "destructive",
            })
        } finally {
            setProcessing(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
            case "rejected":
                return <Badge variant="destructive">Rejected</Badge>
            default:
                return <Badge variant="secondary">Pending</Badge>
        }
    }

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary" />
                    Redemptions
                </h1>
                <p className="text-sm text-muted-foreground">
                    Manage point redemption requests
                </p>
            </div>

            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-4">
                    <TabsList>
                        <TabsTrigger value="pending" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Pending
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Approved
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Rejected
                        </TabsTrigger>
                        <TabsTrigger value="all">All Requests</TabsTrigger>
                    </TabsList>

                    <Button variant="outline" size="sm" onClick={() => fetchRequests()}>
                        Refresh
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No redemption requests found.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{req.user?.full_name || "Unknown User"}</span>
                                                    <span className="text-xs text-muted-foreground">{req.user?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold flex items-center gap-1">
                                                        ₦{req.amount_naira.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {req.amount_points.toLocaleString()} pts
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground">
                                                    Phone: <span className="font-mono text-foreground">{req.phone_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(req.created_at), "MMM d, yyyy h:mm a")}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(req.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {req.status === "pending" && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 h-8"
                                                            onClick={() => handleOpenProcessDialog(req, "approved")}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="h-8"
                                                            onClick={() => handleOpenProcessDialog(req, "rejected")}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                                {req.status !== "pending" && req.admin_note && (
                                                    <span className="text-xs text-muted-foreground italic max-w-[150px] inline-block truncate" title={req.admin_note}>
                                                        "{req.admin_note}"
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </Tabs>

            {/* Process Dialog */}
            <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {processStatus === "approved" ? "Approve Redemption" : "Reject Redemption"}
                        </DialogTitle>
                        <DialogDescription>
                            {processStatus === "approved"
                                ? `Are you sure you want to approve this redemption for ₦${selectedRequest?.amount_naira}? This action cannot be undone.`
                                : `Are you sure you want to reject this request? Points will be refunded to the user.`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label htmlFor="note" className="text-sm font-medium">
                                Admin Note (Optional)
                            </label>
                            <Textarea
                                id="note"
                                placeholder={processStatus === "approved" ? "Transaction ID: ..." : "Reason for rejection..."}
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                            />
                        </div>

                        {processStatus === "approved" && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2 text-yellow-800 text-sm">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <span>
                                    Please ensure you have completed the bank transfer <strong>before</strong> clicking confirm. The system does not process payouts automatically.
                                </span>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleProcessRequest}
                            disabled={processing}
                            variant={processStatus === "approved" ? "default" : "destructive"}
                            className={processStatus === "approved" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {processStatus === "approved" ? "Confirm Approval" : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
