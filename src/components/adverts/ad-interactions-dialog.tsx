
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Loader2, Search, Filter, ExternalLink } from "lucide-react"
import Link from "next/link"

interface AdInteraction {
    id: string
    created_at: string
    event_type: 'click' | 'impression'
    user_id: string | null
    profiles: {
        full_name: string | null
        email: string | null
    } | null
}

interface AdInteractionsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    advertId: string | null
    advertTitle: string | null
}

export function AdInteractionsDialog({
    open,
    onOpenChange,
    advertId,
    advertTitle,
}: AdInteractionsDialogProps) {
    const [interactions, setInteractions] = useState<AdInteraction[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [eventTypeFilter, setEventTypeFilter] = useState<string>("all")

    useEffect(() => {
        if (open && advertId) {
            fetchInteractions()
        }
    }, [open, advertId])

    const fetchInteractions = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('ad_analytics')
            .select(`
        id,
        created_at,
        event_type,
        user_id,
        profiles (
          full_name,
          email
        )
      `)
            .eq('advert_id', advertId)
            .order('created_at', { ascending: false })
            .limit(100) // Increased limit for better filtering

        if (error) {
            console.error('Error fetching interactions:', error)
        } else {
            setInteractions(data as any[] || [])
        }
        setIsLoading(false)
    }

    const filteredInteractions = useMemo(() => {
        return interactions.filter(item => {
            const matchesSearch = searchQuery.toLowerCase() === '' ||
                item.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesType = eventTypeFilter === 'all' || item.event_type === eventTypeFilter

            return matchesSearch && matchesType
        })
    }, [interactions, searchQuery, eventTypeFilter])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Analytics for "{advertTitle}"</DialogTitle>
                    <DialogDescription>
                        Recent interactions with this advertisement.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 my-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Event" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events</SelectItem>
                            <SelectItem value="click">Clicks</SelectItem>
                            <SelectItem value="impression">Impressions</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Event</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredInteractions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No interactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInteractions.map((interaction) => (
                                    <TableRow key={interaction.id}>
                                        <TableCell>
                                            {format(new Date(interaction.created_at), 'MMM d, yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            {interaction.profiles?.full_name ? (
                                                <Link
                                                    href={`/dashboard/users/${interaction.user_id}`}
                                                    className="flex items-center hover:underline text-primary"
                                                    target="_blank"
                                                >
                                                    {interaction.profiles.full_name}
                                                    <ExternalLink className="ml-1 h-3 w-3" />
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground italic">
                                                    Unknown / Guest
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {interaction.profiles?.email || (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${interaction.event_type === 'click'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {interaction.event_type.toUpperCase()}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}
