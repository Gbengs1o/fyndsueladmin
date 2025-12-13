"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Send, Loader2 } from "lucide-react"
import { NIGERIAN_STATES } from "@/lib/states"
import { MultiSelect } from "@/components/ui/multi-select"
import { UserPicker } from "@/components/user-picker"

export default function NotificationsPage() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [segment, setSegment] = useState("all")

    // Enhanced Targeting State
    const [selectedStates, setSelectedStates] = useState<string[]>([])
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

    // Convert states to options
    const stateOptions = NIGERIAN_STATES.map(s => ({ label: s, value: s }))

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = event.currentTarget
        setIsLoading(true)
        const formData = new FormData(form)
        const data: any = Object.fromEntries(formData.entries())

        // Attach rich targeting data
        if (segment === "specific-state") {
            if (selectedStates.length === 0) {
                toast({ variant: "destructive", title: "Error", description: "Please select at least one state." })
                setIsLoading(false)
                return
            }
            data.targetStates = selectedStates
        } else if (segment === "specific-user") {
            if (selectedUserIds.length === 0) {
                toast({ variant: "destructive", title: "Error", description: "Please select at least one user." })
                setIsLoading(false)
                return
            }
            data.targetUserIds = selectedUserIds
        }

        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send notification')
            }

            toast({
                title: "Notification Sent!",
                description: `Successfully sent to ${result.count} user(s).`,
            })

            // Reset form safely
            form.reset()
            setSegment("all")
            setSelectedStates([])
            setSelectedUserIds([])
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight font-headline">Notification Broadcast</h1>
                <p className="text-muted-foreground">Send push notifications to user segments with advanced targeting.</p>
            </div>
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Compose Notification</CardTitle>
                    <CardDescription>Choose your audience and craft your message.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="segment">Target Audience</Label>
                            <Select name="segment" value={segment} onValueChange={setSegment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user segment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    <SelectItem value="specific-state">Specific State(s)</SelectItem>
                                    <SelectItem value="specific-user">Specific User(s)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {segment === 'specific-state' && (
                            <div className="space-y-2">
                                <Label>Select States</Label>
                                <MultiSelect
                                    options={stateOptions}
                                    selected={selectedStates}
                                    onChange={setSelectedStates}
                                    placeholder="Select one or more states..."
                                    searchPlaceholder="Search states..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Users in any of the selected states will receive the notification.
                                </p>
                            </div>
                        )}

                        {segment === 'specific-user' && (
                            <div className="space-y-2">
                                <Label>Select Users</Label>
                                <UserPicker
                                    value={selectedUserIds}
                                    onChange={setSelectedUserIds}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Search by name or email. Selected users will receive the notification.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="title">Notification Title</Label>
                            <Input id="title" name="title" placeholder="e.g., Price Drop Alert!" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea id="message" name="message" placeholder="Enter your notification message here..." required />
                        </div>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isLoading ? 'Sending...' : 'Send Notification'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
