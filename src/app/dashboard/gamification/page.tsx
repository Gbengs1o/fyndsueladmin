"use client"

import {
    Gamepad2,
    Loader2,
    Pencil,
    Save,
    Settings
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// --- Types ---
interface GamificationAction {
    id: number
    action_key: string
    display_name: string
    description: string | null
    points: number
    is_enabled: boolean
    frequency_limit: string
    updated_at: string
}

interface GamificationSetting {
    key: string
    value: { rate?: number; value?: number }
    updated_at: string
}

export default function GamificationPage() {
    const { toast } = useToast()

    // State
    const [actions, setActions] = useState<GamificationAction[]>([])
    const [settings, setSettings] = useState<GamificationSetting[]>([])
    const [actionsLoading, setActionsLoading] = useState(true)
    const [settingsLoading, setSettingsLoading] = useState(true)
    const [savingSettings, setSavingSettings] = useState(false)

    // Edit dialog state
    const [editingAction, setEditingAction] = useState<GamificationAction | null>(null)
    const [editPoints, setEditPoints] = useState("")
    const [editFrequency, setEditFrequency] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [savingAction, setSavingAction] = useState(false)

    // Local settings form state
    const [pointsPerNaira, setPointsPerNaira] = useState("")
    const [minRedemption, setMinRedemption] = useState("")
    const [cooldownDays, setCooldownDays] = useState("")

    // Fetch data
    const fetchActions = useCallback(async () => {
        setActionsLoading(true)
        try {
            const { data, error } = await supabase.rpc("get_gamification_config")
            if (error) throw error
            setActions(data || [])
        } catch (error) {
            console.error("Error fetching actions:", error)
            toast({
                title: "Error",
                description: "Failed to load gamification actions",
                variant: "destructive",
            })
        } finally {
            setActionsLoading(false)
        }
    }, [toast])

    const fetchSettings = useCallback(async () => {
        setSettingsLoading(true)
        try {
            const { data, error } = await supabase.rpc("get_gamification_settings")
            if (error) throw error
            setSettings(data || [])

            // Populate form fields
            data?.forEach((s: GamificationSetting) => {
                if (s.key === "points_per_naira") setPointsPerNaira(String(s.value.rate || 5))
                if (s.key === "min_redemption_points") setMinRedemption(String(s.value.value || 1000))
                if (s.key === "redemption_cooldown_days") setCooldownDays(String(s.value.value || 0))
            })
        } catch (error) {
            console.error("Error fetching settings:", error)
            toast({
                title: "Error",
                description: "Failed to load gamification settings",
                variant: "destructive",
            })
        } finally {
            setSettingsLoading(false)
        }
    }, [toast])

    useEffect(() => {
        fetchActions()
        fetchSettings()
    }, [fetchActions, fetchSettings])

    // Toggle action enabled
    const handleToggleEnabled = async (action: GamificationAction) => {
        const newEnabled = !action.is_enabled

        // Optimistic update
        setActions((prev) =>
            prev.map((a) => (a.id === action.id ? { ...a, is_enabled: newEnabled } : a))
        )

        try {
            const { data, error } = await supabase.rpc("update_gamification_config", {
                p_action_key: action.action_key,
                p_is_enabled: newEnabled,
            })
            if (error) throw error

            toast({
                title: newEnabled ? "Action Enabled" : "Action Disabled",
                description: `${action.display_name} has been ${newEnabled ? "enabled" : "disabled"}`,
            })
        } catch (error) {
            // Revert on error
            setActions((prev) =>
                prev.map((a) => (a.id === action.id ? { ...a, is_enabled: !newEnabled } : a))
            )
            toast({
                title: "Error",
                description: "Failed to update action status",
                variant: "destructive",
            })
        }
    }

    // Open edit dialog
    const handleEditAction = (action: GamificationAction) => {
        setEditingAction(action)
        setEditPoints(String(action.points))
        setEditFrequency(action.frequency_limit)
        setEditDescription(action.description || "")
    }

    // Save action changes
    const handleSaveAction = async () => {
        if (!editingAction) return
        setSavingAction(true)

        try {
            const { error } = await supabase.rpc("update_gamification_config", {
                p_action_key: editingAction.action_key,
                p_points: parseInt(editPoints) || 0,
                p_frequency_limit: editFrequency,
                p_description: editDescription,
            })
            if (error) throw error

            toast({
                title: "Action Updated",
                description: `${editingAction.display_name} has been updated`,
            })

            setEditingAction(null)
            fetchActions()
        } catch (error) {
            console.error("Error saving action:", error)
            toast({
                title: "Error",
                description: "Failed to save action changes",
                variant: "destructive",
            })
        } finally {
            setSavingAction(false)
        }
    }

    // Save global settings
    const handleSaveSettings = async () => {
        setSavingSettings(true)

        try {
            // Update all settings
            await Promise.all([
                supabase.rpc("update_gamification_setting", {
                    p_key: "points_per_naira",
                    p_value: { rate: parseInt(pointsPerNaira) || 5 },
                }),
                supabase.rpc("update_gamification_setting", {
                    p_key: "min_redemption_points",
                    p_value: { value: parseInt(minRedemption) || 1000 },
                }),
                supabase.rpc("update_gamification_setting", {
                    p_key: "redemption_cooldown_days",
                    p_value: { value: parseInt(cooldownDays) || 0 },
                }),
            ])

            toast({
                title: "Settings Saved",
                description: "Global gamification settings have been updated",
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: "Error",
                description: "Failed to save settings",
                variant: "destructive",
            })
        } finally {
            setSavingSettings(false)
        }
    }

    const getFrequencyLabel = (freq: string) => {
        switch (freq) {
            case "once_ever":
                return "Once Ever"
            case "once_daily":
                return "Once Daily"
            default:
                return "Unlimited"
        }
    }

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Gamepad2 className="h-6 w-6 text-primary" />
                    Gamification
                </h1>
                <p className="text-sm text-muted-foreground">
                    Configure point-earning actions and redemption settings
                </p>
            </div>

            {/* Action Configuration Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Point Actions</CardTitle>
                    <CardDescription>
                        Configure how many points users earn for each action
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {actionsLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-center">Points</TableHead>
                                    <TableHead className="text-center">Frequency</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {actions.map((action) => (
                                    <TableRow key={action.id}>
                                        <TableCell className="font-medium">
                                            {action.display_name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                            {action.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">
                                                {action.points} pts
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="text-xs">
                                                {getFrequencyLabel(action.frequency_limit)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={action.is_enabled}
                                                onCheckedChange={() => handleToggleEnabled(action)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditAction(action)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Global Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Redemption Settings
                    </CardTitle>
                    <CardDescription>
                        Configure how points convert to rewards
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {settingsLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="pointsPerNaira">Points per ₦1</Label>
                                    <Input
                                        id="pointsPerNaira"
                                        type="number"
                                        value={pointsPerNaira}
                                        onChange={(e) => setPointsPerNaira(e.target.value)}
                                        placeholder="5"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {pointsPerNaira && `${parseInt(pointsPerNaira) * 100 || 500} pts = ₦100`}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="minRedemption">Minimum Redemption</Label>
                                    <Input
                                        id="minRedemption"
                                        type="number"
                                        value={minRedemption}
                                        onChange={(e) => setMinRedemption(e.target.value)}
                                        placeholder="1000"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum points required to redeem
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cooldownDays">Cooldown (Days)</Label>
                                    <Input
                                        id="cooldownDays"
                                        type="number"
                                        value={cooldownDays}
                                        onChange={(e) => setCooldownDays(e.target.value)}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        0 = no cooldown between redemptions
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-end">
                                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                                    {savingSettings ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Save Settings
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Action Dialog */}
            <Dialog open={!!editingAction} onOpenChange={() => setEditingAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Action</DialogTitle>
                        <DialogDescription>
                            Modify the configuration for {editingAction?.display_name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="editPoints">Points</Label>
                            <Input
                                id="editPoints"
                                type="number"
                                value={editPoints}
                                onChange={(e) => setEditPoints(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editFrequency">Frequency Limit</Label>
                            <Select value={editFrequency} onValueChange={setEditFrequency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unlimited">Unlimited</SelectItem>
                                    <SelectItem value="once_daily">Once Daily</SelectItem>
                                    <SelectItem value="once_ever">Once Ever</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editDescription">Description</Label>
                            <Input
                                id="editDescription"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Points for..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingAction(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveAction} disabled={savingAction}>
                            {savingAction ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
