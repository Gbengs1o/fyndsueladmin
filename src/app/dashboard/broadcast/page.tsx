
"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { 
    Loader2, Mail, Send, CheckSquare, Square, Search, User, Settings, Save, 
    ChevronDown, ChevronUp, Palette, Image, Type, X, UploadCloud, FileImage,
    Maximize2, Minimize2, Columns
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Eye } from "lucide-react"

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
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'split' | 'recipients' | 'message'>('split')
    const [selectedImages, setSelectedImages] = useState<{ id: string; file: File; preview: string; base64: string }[]>([])
    const [isImageUploading, setIsImageUploading] = useState(false)

    // Template Settings State
    const [templateSettings, setTemplateSettings] = useState({
        headerColor: "#6366f1",
        logoText: "",
        logoImageUrl: "",
        greetingPrefix: "Hello",
        footerText: "",
        showFooter: true
    })
    const [showTemplateSettings, setShowTemplateSettings] = useState(false)
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)

    // SMTP Settings State
    const [smtpConfig, setSmtpConfig] = useState({
        host: "",
        port: 465,
        user: "",
        password: "",
        fromEmail: "",
        fromName: "",
        secure: true
    })
    const [showSmtpSettings, setShowSmtpSettings] = useState(false)
    const [isSavingSmtp, setIsSavingSmtp] = useState(false)
    const [isLoadingSmtp, setIsLoadingSmtp] = useState(false)

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

    const fetchSmtpConfig = useCallback(async () => {
        setIsLoadingSmtp(true)
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'smtp_config')
                .single()

            if (error) {
                if (error.code !== 'PGRST116') throw error // Ignore "no rows found"
            } else if (data?.value) {
                setSmtpConfig(data.value)
            }
        } catch (error: any) {
            console.error("Error fetching SMTP config:", error)
        } finally {
            setIsLoadingSmtp(false)
        }
    }, [])

    const fetchTemplateSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'email_template_settings')
                .single()

            if (error) {
                if (error.code !== 'PGRST116') throw error
            } else if (data?.value) {
                setTemplateSettings(data.value)
            }
        } catch (error: any) {
            console.error("Error fetching template settings:", error)
        }
    }, [])

    useEffect(() => {
        if (!authLoading) {
            fetchUsers()
            fetchSmtpConfig()
            fetchTemplateSettings()
        }
    }, [fetchUsers, fetchSmtpConfig, fetchTemplateSettings, authLoading])

    const saveTemplateSettings = async () => {
        setIsSavingTemplate(true)
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'email_template_settings', value: templateSettings }, { onConflict: 'key' })

            if (error) throw error
            toast({ title: "Template Saved", description: "Email template settings saved successfully." })
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message })
        } finally {
            setIsSavingTemplate(false)
        }
    }

    const saveSmtpConfig = async () => {
        // Validation
        if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password || !smtpConfig.fromEmail) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "SMTP Host, User, Password, and From Email are required."
            })
            return
        }

        setIsSavingSmtp(true)
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'smtp_config', value: smtpConfig }, { onConflict: 'key' })

            if (error) throw error

            toast({ title: "Settings Saved", description: "SMTP configuration has been updated." })
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message })
        } finally {
            setIsSavingSmtp(false)
        }
    }

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsImageUploading(true)
        const newImages = [...selectedImages]

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                toast({ variant: "destructive", title: "Invalid file", description: `${file.name} is not an image.` })
                continue
            }

            // Check file size (limit to 2MB for base64 transport)
            if (file.size > 2 * 1024 * 1024) {
                toast({ variant: "destructive", title: "File too large", description: `${file.name} is larger than 2MB.` })
                continue
            }

            // Convert to base64
            const reader = new FileReader()
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string)
                reader.readAsDataURL(file)
            })

            const base64 = await base64Promise
            const preview = URL.createObjectURL(file)
            
            newImages.push({
                id: Math.random().toString(36).substring(2, 9),
                file,
                preview,
                base64
            })
        }

        setSelectedImages(newImages)
        setIsImageUploading(false)
        // Reset input
        e.target.value = ''
    }

    const removeImage = (id: string) => {
        setSelectedImages(prev => {
            const imageToRemove = prev.find(img => img.id === id)
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.preview)
            }
            return prev.filter(img => img.id !== id)
        })
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
                    message,
                    smtpSettings: smtpConfig,
                    templateSettings,
                    images: selectedImages.map(img => img.base64)
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
            setSelectedImages([])

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

            {/* SMTP Configuration Section */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="py-4 cursor-pointer select-none" onClick={() => setShowSmtpSettings(!showSmtpSettings)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">SMTP Configuration</CardTitle>
                            <Badge variant="outline" className="ml-2 bg-background">Required for Broadcast</Badge>
                        </div>
                        {showSmtpSettings ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                </CardHeader>
                {showSmtpSettings && (
                    <CardContent className="pb-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Host</label>
                                <Input
                                    placeholder="smtp.resend.com"
                                    value={smtpConfig.host}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Port</label>
                                <Input
                                    type="number"
                                    placeholder="465"
                                    value={smtpConfig.port}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 0 })}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Email</label>
                                <Input
                                    placeholder="noreply@yourdomain.com"
                                    value={smtpConfig.fromEmail}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Name</label>
                                <Input
                                    placeholder="Support"
                                    value={smtpConfig.fromName || ""}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP User</label>
                                <Input
                                    placeholder="resend"
                                    value={smtpConfig.user}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={smtpConfig.password}
                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="flex items-end pb-1">
                                <Button
                                    onClick={saveSmtpConfig}
                                    disabled={isSavingSmtp}
                                    className="w-full"
                                >
                                    {isSavingSmtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Config
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            <div className={cn(
                "grid grid-cols-1 gap-6 transition-all duration-300 ease-in-out",
                viewMode === 'split' ? "lg:grid-cols-3" : "grid-cols-1"
            )}>

                {/* Left Column: User Selection (2/3 width when split) */}
                <div className={cn(
                    "space-y-4 transition-all duration-500",
                    viewMode === 'recipients' ? "lg:col-span-3" : viewMode === 'split' ? "lg:col-span-2" : "hidden"
                )}>
                    <Card className="h-full flex flex-col">
                        <CardHeader className="pb-3">
                                <div className="flex items-center gap-4">
                                    <CardTitle>Select Recipients</CardTitle>
                                    <div className="flex items-center bg-muted/50 rounded-md p-0.5">
                                        <Button 
                                            variant={viewMode === 'split' ? "secondary" : "ghost"} 
                                            size="icon" 
                                            className="h-7 w-7"
                                            onClick={() => setViewMode('split')}
                                            title="Split View"
                                        >
                                            <Columns className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                            variant={viewMode === 'recipients' ? "secondary" : "ghost"} 
                                            size="icon" 
                                            className="h-7 w-7"
                                            onClick={() => setViewMode('recipients')}
                                            title="Focus Recipients"
                                        >
                                            <Maximize2 className="h-3.5 w-3.5" />
                                        </Button>
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


                {/* Right Column: Compose Message (1/3 width when split) */}
                <div className={cn(
                    "transition-all duration-500",
                    viewMode === 'recipients' ? "hidden" : viewMode === 'message' ? "lg:col-span-1" : "lg:col-span-1"
                )}>
                    <Card className={cn(viewMode !== 'message' && "sticky top-6")}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Compose Message</CardTitle>
                                <div className="flex items-center bg-muted/50 rounded-md p-0.5">
                                    <Button 
                                        variant={viewMode === 'split' ? "secondary" : "ghost"} 
                                        size="icon" 
                                        className="h-7 w-7"
                                        onClick={() => setViewMode('split')}
                                        title="Split View"
                                    >
                                        <Columns className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                        variant={viewMode === 'message' ? "secondary" : "ghost"} 
                                        size="icon" 
                                        className="h-7 w-7"
                                        onClick={() => setViewMode('message')}
                                        title="Focus Composer"
                                    >
                                        <Maximize2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>
                                Sending to <span className="font-semibold text-foreground">{selectedUsers.size}</span> recipients
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Template Customization Toggle */}
                            <div
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 cursor-pointer select-none"
                                onClick={() => setShowTemplateSettings(!showTemplateSettings)}
                            >
                                <div className="flex items-center gap-2">
                                    <Palette className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">Customize Template</span>
                                </div>
                                {showTemplateSettings ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>

                            {showTemplateSettings && (
                                <div className="space-y-3 p-3 rounded-lg border bg-background">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Header Color</Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={templateSettings.headerColor}
                                                    onChange={(e) => setTemplateSettings({ ...templateSettings, headerColor: e.target.value })}
                                                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                                />
                                                <Input
                                                    value={templateSettings.headerColor}
                                                    onChange={(e) => setTemplateSettings({ ...templateSettings, headerColor: e.target.value })}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Greeting Prefix</Label>
                                            <Input
                                                placeholder="Hello"
                                                value={templateSettings.greetingPrefix}
                                                onChange={(e) => setTemplateSettings({ ...templateSettings, greetingPrefix: e.target.value })}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Logo Text (shown in header)</Label>
                                        <Input
                                            placeholder="e.g. FYND FUEL"
                                            value={templateSettings.logoText}
                                            onChange={(e) => setTemplateSettings({ ...templateSettings, logoText: e.target.value })}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Logo Image URL (overrides text)</Label>
                                        <Input
                                            placeholder="https://your-logo.com/logo.png"
                                            value={templateSettings.logoImageUrl}
                                            onChange={(e) => setTemplateSettings({ ...templateSettings, logoImageUrl: e.target.value })}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Footer Text (leave empty to hide footer)</Label>
                                        <Textarea
                                            placeholder="e.g. © 2026 Your Company. All rights reserved."
                                            value={templateSettings.footerText}
                                            onChange={(e) => setTemplateSettings({ ...templateSettings, footerText: e.target.value })}
                                            className="min-h-[60px] text-xs resize-none"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={templateSettings.showFooter}
                                                onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, showFooter: checked as boolean })}
                                            />
                                            <Label className="text-xs">Show Footer</Label>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={saveTemplateSettings}
                                            disabled={isSavingTemplate}
                                        >
                                            {isSavingTemplate ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                                            Save Template
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input
                                    placeholder="e.g. Important Update regarding Fuel Prices"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Message Body</Label>
                                <RichTextEditor
                                    value={message}
                                    onChange={setMessage}
                                    placeholder="Type your message here..."
                                />
                            </div>

                            {/* Image Attachments Section */}
                            <div className="space-y-3">
                                <Label>Image Attachments (Fliers)</Label>
                                {selectedImages.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        {selectedImages.map((img) => (
                                            <div key={img.id} className="relative group aspect-square rounded-md overflow-hidden border">
                                                <img 
                                                    src={img.preview} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={() => removeImage(img.id)}
                                                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Label
                                        htmlFor="image-upload"
                                        className="flex items-center justify-center gap-2 w-full h-10 px-4 py-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground"
                                    >
                                        {isImageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                        {isImageUploading ? "Uploading..." : "Upload Image"}
                                    </Label>
                                    <input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isImageUploading}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">
                                    Maximum 2MB per image. Images will be embedded in the email.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Emails are sent individually.
                                    </p>
                                    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                Preview
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">
                                            <DialogHeader className="p-6 bg-background border-b z-10">
                                                <DialogTitle>Email Preview</DialogTitle>
                                                <DialogDescription>
                                                    Subject: {subject || '(No Subject)'}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="flex-1 overflow-auto bg-muted/30 p-4 md:p-8 flex justify-center">
                                                <div className="w-full max-w-[600px] shadow-sm rounded-lg overflow-hidden border bg-white">
                                                    <div style={{ backgroundColor: templateSettings.headerColor, padding: '32px 24px', textAlign: 'center' }}>
                                                        {templateSettings.logoImageUrl ? (
                                                            <img src={templateSettings.logoImageUrl} alt={templateSettings.logoText || 'Logo'} style={{ maxHeight: '48px', maxWidth: '200px' }} />
                                                        ) : (
                                                            <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.025em' }}>{templateSettings.logoText || ''}</span>
                                                        )}
                                                    </div>
                                                    <div style={{ padding: '40px 32px' }}>
                                                        <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>{templateSettings.greetingPrefix || 'Hello'} [User Name],</div>
                                                        <div 
                                                            style={{ fontSize: '16px', color: '#374151', lineHeight: '1.6' }}
                                                            dangerouslySetInnerHTML={{ __html: message || '<p>Your message will appear here...</p>' }}
                                                        />
                                                        {selectedImages.length > 0 && (
                                                            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                                {selectedImages.map((img) => (
                                                                    <div key={img.id} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                                                        <img src={img.preview} alt="Attachment" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {templateSettings.showFooter && templateSettings.footerText && (
                                                        <div style={{ padding: '32px', backgroundColor: '#f3f4f6', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                                                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0', whiteSpace: 'pre-wrap' }}>{templateSettings.footerText}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
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
