
"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Send, CheckSquare, Square, Search, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface User {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    role: string
}

export default function BroadcastPage() {
    const { isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const router = useRouter()

    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState("")

    // Email Form State
    const [subject, setSubject] = useState("")
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        // We reuse the admin RPC that correctly fetches emails from auth.users
        // We'll fetch a larger limit to facilitate selection, though pagination is better for scaling.
        // For now, let's fetch top 100 recent users to keep it simple as requested "all users" might be huge.
        // In a real app we'd need server-side pagination + selection persistence.
        const { data, error } = await supabase.rpc('get_users_for_admin_page', {
            _search_term: searchTerm,
            _sort_by: 'newest',
            _provider_filter: 'email', // Only care about users with emails
            _has_avatar_filter: null,
            _limit: 100,
            _offset: 0
        })

        if (error) {
            console.error("Error fetching users:", error)
            toast({ variant: "destructive", title: "Error", description: "Failed to load users." })
        } else {
            // Filter out any potential null emails just in case, though RPC filter should handle it
            const validUsers = data?.filter((u: any) => u.email) || []
            setUsers(validUsers)
        }
        setLoading(false)
    }, [searchTerm, toast])

    useEffect(() => {
        if (!authLoading) {
            fetchUsers()
        }
    }, [fetchUsers, authLoading])

    const handleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set())
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)))
        }
    }

    const handleToggleUser = (userId: string) => {
        const newSelected = new Set(selectedUsers)
        if (newSelected.has(userId)) {
            newSelected.delete(userId)
        } else {
            newSelected.add(userId)
        }
        setSelectedUsers(newSelected)
    }

    const handleSendBroadcast = async () => {
        if (selectedUsers.size === 0) {
            toast({ variant: "destructive", title: "No recipients", description: "Please select at least one user." })
            return
        }
        if (!subject.trim() || !message.trim()) {
            toast({ variant: "destructive", title: "Missing fields", description: "Subject and message are required." })
            return
        }

        setSending(true)

        try {
            // Get the email addresses of selected users
            const recipients = users
                .filter(u => selectedUsers.has(u.id))
                .map(u => ({ email: u.email!, name: u.full_name || 'Valued User' })) // Non-null assertion safe due to filter

            // Call our Next.js API route (we need to create this)
            const response = await fetch('/api/send-broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients,
                    subject,
                    message
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send emails')
            }

            toast({
                title: "Broadcast Sent!",
                description: `Successfully sent emails to ${recipients.length} users.`,
                className: "bg-green-50 border-green-200 text-green-800"
            })

            // Reset form
            setSubject("")
            setMessage("")
            setSelectedUsers(new Set())

        } catch (error: any) {
            console.error("Broadcast error:", error)
            toast({ variant: "destructive", title: "Broadcast Failed", description: error.message })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Mail className="h-8 w-8 text-primary" />
                    Email Broadcast
                </h1>
                <p className="text-muted-foreground">Select users and send announcements, newsletters, or updates directly to their inbox.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: User Selection (2/3 width) */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle>Select Recipients</CardTitle>
                                <div className="text-sm text-muted-foreground">
                                    {selectedUsers.size} selected
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-auto max-h-[600px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={users.length > 0 && selectedUsers.size === users.length}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-48 text-center">
                                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : users.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                No users found with email addresses.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((user) => (
                                            <TableRow
                                                key={user.id}
                                                className={selectedUsers.has(user.id) ? "bg-muted/50" : ""}
                                                onClick={() => handleToggleUser(user.id)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedUsers.has(user.id)}
                                                        onCheckedChange={() => handleToggleUser(user.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user.avatar_url || ''} />
                                                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">{user.full_name || 'Anonymous'}</span>
                                                            {user.role === 'admin' && <Badge variant="outline" className="w-fit text-[10px] h-4 px-1">Admin</Badge>}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {user.email}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/dashboard/users/${user.id}`);
                                                        }}
                                                    >
                                                        View Profile
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Compose Message (1/3 width) */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Compose Message</CardTitle>
                            <CardDescription>
                                Sending to <span className="font-semibold text-foreground">{selectedUsers.size}</span> recipients
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <Input
                                    placeholder="e.g. Important Update regarding Fuel Prices"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Message Body</label>
                                <Textarea
                                    placeholder="Type your message here..."
                                    className="min-h-[300px] resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Note: Emails will be sent individually to each recipient.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleSendBroadcast}
                                disabled={sending || selectedUsers.size === 0}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Broadcast
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

            </div>
        </div>
    )
}
