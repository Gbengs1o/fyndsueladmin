"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { 
    Loader2, Mail, Send, CheckSquare, Square, Search, User, Settings, Save, 
    ChevronDown, ChevronUp, Palette, Image, Type, X, UploadCloud, FileImage,
    Maximize2, Minimize2, Columns, Filter, Check, Trash2, Globe, Paperclip, 
    AtSign, AlertCircle, Info, SendHorizontal
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Eye } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all')

    // Email Form State
    const [subject, setSubject] = useState("")
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [selectedImages, setSelectedImages] = useState<{ id: string; file: File; preview: string; base64: string }[]>([])
    const [isImageUploading, setIsImageUploading] = useState(false)

    // Template Settings State
    const [templateSettings, setTemplateSettings] = useState({
        headerColor: "#6366f1",
        logoText: "FYND FUEL",
        logoImageUrl: "",
        greetingPrefix: "Hello",
        footerText: "© 2026 Fynd Fuel Corporation. All rights reserved.",
        showFooter: true
    })
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)

    // SMTP Settings State
    const [smtpConfig, setSmtpConfig] = useState({
        host: "",
        port: 465,
        user: "",
        password: "",
        fromEmail: "",
        fromName: "Fynd Fuel Support",
        secure: true
    })
    const [isSavingSmtp, setIsSavingSmtp] = useState(false)
    const [isLoadingSmtp, setIsLoadingSmtp] = useState(false)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_users_for_admin_page', {
            _search_term: searchTerm,
            _sort_by: 'newest',
            _provider_filter: 'email',
            _has_avatar_filter: null,
            _limit: 100,
            _offset: 0
        })

        if (error) {
            console.error("Error fetching users:", error)
            toast({ variant: "destructive", title: "Error", description: "Failed to load users." })
        } else {
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
                if (error.code !== 'PGRST116') throw error
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

    const saveSettings = async () => {
        setIsSavingSmtp(true)
        setIsSavingTemplate(true)
        try {
            // Validate SMTP
            if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password || !smtpConfig.fromEmail) {
                throw new Error("SMTP Host, User, Password, and From Email are required.")
            }

            const results = await Promise.all([
                supabase.from('app_settings').upsert({ key: 'smtp_config', value: smtpConfig }, { onConflict: 'key' }),
                supabase.from('app_settings').upsert({ key: 'email_template_settings', value: templateSettings }, { onConflict: 'key' })
            ])

            const error = results.find(r => r.error)?.error
            if (error) throw error

            toast({ title: "Settings Saved", description: "SMTP and Template settings updated successfully." })
            setIsSettingsOpen(false)
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message })
        } finally {
            setIsSavingSmtp(false)
            setIsSavingTemplate(false)
        }
    }

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            if (filterRole === 'all') return true
            return user.role === filterRole
        })
    }, [users, filterRole])

    const handleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set())
        } else {
            setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
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
        processFiles(Array.from(files))
        e.target.value = ''
    }

    const handlePasteImage = async (files: File[]) => {
        processFiles(files)
    }

    const processFiles = async (files: File[]) => {
        setIsImageUploading(true)
        const newImages = [...selectedImages]

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue
            if (file.size > 2 * 1024 * 1024) {
                toast({ variant: "destructive", title: "File too large", description: `${file.name} is larger than 2MB.` })
                continue
            }

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
    }

    const removeImage = (id: string) => {
        setSelectedImages(prev => {
            const imageToRemove = prev.find(img => img.id === id)
            if (imageToRemove) URL.revokeObjectURL(imageToRemove.preview)
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
            const recipients = users
                .filter(u => selectedUsers.has(u.id))
                .map(u => ({ email: u.email!, name: u.full_name || 'Valued User' }))

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
            if (!response.ok) throw new Error(result.error || 'Failed to send emails')

            toast({
                title: "Broadcast Sent!",
                description: `Successfully sent to ${recipients.length} users.`,
                className: "bg-primary text-primary-foreground border-none shadow-lg"
            })

            setSubject("")
            setMessage("")
            setSelectedUsers(new Set())
            setSelectedImages([])
        } catch (error: any) {
            toast({ variant: "destructive", title: "Broadcast Failed", description: error.message })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-card shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Mail className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Broadcast Center</h1>
                        <p className="text-[11px] text-muted-foreground uppercase font-semibold">Communicate with your community</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsSettingsOpen(true)}
                        className="h-9 gap-2 border-primary/20 hover:bg-primary/5"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button 
                        onClick={handleSendBroadcast} 
                        disabled={sending || selectedUsers.size === 0}
                        className="h-9 gap-2 shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                        {sending ? "Sending..." : `Send to ${selectedUsers.size} Users`}
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar: Recipients */}
                <aside className="w-[380px] border-r bg-muted/20 flex flex-col">
                    <div className="p-4 space-y-4 border-b bg-card/50">
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input
                                placeholder="Search recipients..."
                                className="pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary transition-all rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex bg-muted p-1 rounded-lg">
                                <Button 
                                    variant={filterRole === 'all' ? "secondary" : "ghost"} 
                                    size="sm" 
                                    className="h-7 text-[10px] px-3 font-bold"
                                    onClick={() => setFilterRole('all')}
                                >
                                    ALL
                                </Button>
                                <Button 
                                    variant={filterRole === 'admin' ? "secondary" : "ghost"} 
                                    size="sm" 
                                    className="h-7 text-[10px] px-3 font-bold"
                                    onClick={() => setFilterRole('admin')}
                                >
                                    ADMINS
                                </Button>
                            </div>
                            
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5"
                                onClick={handleSelectAll}
                            >
                                {selectedUsers.size === filteredUsers.length ? "DESELECT ALL" : "SELECT ALL"}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary/40" />
                                <p className="text-xs">Fetching users...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center px-4">
                                <Info className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-xs font-medium">No users found</p>
                                <p className="text-[10px]">Try adjusting your search or filters</p>
                            </div>
                        ) : (
                            filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className={cn(
                                        "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                                        selectedUsers.has(user.id) 
                                            ? "bg-primary/10 border-primary/20 translate-x-1" 
                                            : "hover:bg-card hover:translate-x-1"
                                    )}
                                    onClick={() => handleToggleUser(user.id)}
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                            <AvatarImage src={user.avatar_url || ''} />
                                            <AvatarFallback className="bg-primary/5 text-primary text-xs uppercase">
                                                {user.full_name?.substring(0, 2) || user.email?.substring(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {selectedUsers.has(user.id) && (
                                            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background shadow-md">
                                                <Check className="h-2.5 w-2.5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                                                {user.full_name || 'Anonymous User'}
                                            </p>
                                            {user.role === 'admin' && (
                                                <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-primary/5 uppercase font-black text-primary border-primary/20 tracking-tighter">
                                                    Admin
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate font-medium">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Main Content: Composer */}
                <main className="flex-1 bg-muted/10 flex flex-col p-6 overflow-y-auto">
                    <div className="max-w-[900px] mx-auto w-full space-y-6">
                        {/* Summary Alert */}
                        {selectedUsers.size > 0 && (
                            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-2 bg-primary/10 rounded-full text-primary">
                                    <Info className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-primary">Targeting {selectedUsers.size} Recipients</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                        This broadcast will be delivered directly to the inboxes of the selected users.
                                    </p>
                                </div>
                            </div>
                        )}

                        <Card className="border-none shadow-xl shadow-primary/5 rounded-3xl overflow-hidden bg-white dark:bg-zinc-950">
                            <CardHeader className="space-y-4 pb-0 pt-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Subject Line</Label>
                                    <Input
                                        placeholder="Enter a compelling subject..."
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="text-lg font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-all placeholder:text-muted-foreground/40 bg-transparent min-h-[50px]"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Message Content</Label>
                                    <div className="rounded-2xl border bg-muted/5 p-1 pt-0 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                        <RichTextEditor
                                            value={message}
                                            onChange={setMessage}
                                            onPasteImage={handlePasteImage}
                                            placeholder="Write your message here... You can paste images directly as well!"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                                            <Paperclip className="h-3 w-3" />
                                            Attachments & Fliers
                                        </Label>
                                        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5 gap-1.5">
                                                    <Eye className="h-3 w-3" />
                                                    PREVIEW EMAIL
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-none rounded-3xl overflow-hidden bg-muted/50">
                                                <div className="p-4 bg-background border-b flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                                            <AtSign className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-sm font-bold">Email Preview</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">Subject: {subject || '(No Subject)'}</Badge>
                                                </div>
                                                <div className="overflow-y-auto p-12 flex justify-center bg-zinc-100 dark:bg-zinc-900">
                                                    <div className="w-full max-w-[600px] bg-white dark:bg-zinc-950 shadow-2xl rounded-[32px] overflow-hidden">
                                                        <div style={{ backgroundColor: templateSettings.headerColor, padding: '48px 32px', textAlign: 'center' }}>
                                                            {templateSettings.logoImageUrl ? (
                                                                <img src={templateSettings.logoImageUrl} alt={templateSettings.logoText} style={{ maxHeight: '64px', maxWidth: '240px', margin: '0 auto' }} />
                                                            ) : (
                                                                <span style={{ color: '#ffffff', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.05em' }}>{templateSettings.logoText}</span>
                                                            )}
                                                        </div>
                                                        <div style={{ padding: '64px 48px' }}>
                                                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>{templateSettings.greetingPrefix} [User Name],</div>
                                                            <div 
                                                                style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.8' }}
                                                                dangerouslySetInnerHTML={{ __html: message || '<p style="color: #9ca3af; font-style: italic;">Enter your content to see it here...</p>' }}
                                                            />
                                                            {selectedImages.length > 0 && (
                                                                <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                                    {selectedImages.map((img) => (
                                                                        <div key={img.id} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                                                            <img src={img.preview} alt="Flyer" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {templateSettings.showFooter && (
                                                            <div style={{ padding: '48px', backgroundColor: '#f9fafb', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
                                                                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{templateSettings.footerText}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {selectedImages.map((img) => (
                                            <div key={img.id} className="relative group aspect-[4/5] rounded-[24px] overflow-hidden bg-muted border-2 border-transparent hover:border-primary/40 transition-all shadow-sm">
                                                <img 
                                                    src={img.preview} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => removeImage(img.id)}
                                                    className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <div className="absolute bottom-3 left-3 text-[10px] text-white font-black drop-shadow-md">
                                                    {(img.file.size / 1024).toFixed(0)} KB
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <div className="flex flex-col">
                                            <Label
                                                htmlFor="image-upload"
                                                className="flex flex-col items-center justify-center gap-3 aspect-[4/5] bg-muted/40 border-2 border-dashed border-muted-foreground/20 rounded-[24px] cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all group"
                                            >
                                                <div className="p-3 bg-background rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                                                    {isImageUploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />}
                                                </div>
                                                <div className="text-center px-4">
                                                    <span className="text-[11px] font-black block uppercase tracking-tighter">Add Flyer</span>
                                                    <span className="text-[9px] text-muted-foreground/60 italic font-medium">JPG, PNG up to 2MB</span>
                                                </div>
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
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 border-t px-8 py-6 flex items-center justify-between">
                                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                                    <Info className="h-3 w-3" />
                                    Drafts are not saved automatically
                                </p>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-muted-foreground font-bold text-[11px]" onClick={() => { setSubject(""); setMessage(""); setSelectedImages([]); setSelectedUsers(new Set()); }}>
                                        RESET FORM
                                    </Button>
                                    <Button 
                                        onClick={handleSendBroadcast} 
                                        disabled={sending || selectedUsers.size === 0 || !subject.trim() || !message.trim()}
                                        className="h-11 rounded-2xl px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-3 ring-offset-background transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
                                        <span className="font-bold tracking-tight">TRANSMIT BROADCAST</span>
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </main>
            </div>

            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="max-w-2xl p-0 border-none rounded-3xl overflow-hidden shadow-2xl">
                    <Tabs defaultValue="smtp" className="w-full">
                        <div className="flex items-center justify-between px-6 py-4 bg-primary/10 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <Settings className="h-5 w-5" />
                                </div>
                                <DialogTitle className="text-lg font-bold tracking-tight">Broadcast Configuration</DialogTitle>
                            </div>
                            <TabsList className="bg-background/80 backdrop-blur">
                                <TabsTrigger value="smtp" className="text-[10px] font-black uppercase">SMTP Relay</TabsTrigger>
                                <TabsTrigger value="template" className="text-[10px] font-black uppercase">Branding</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <TabsContent value="smtp" className="space-y-6 m-0">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="space-y-2 col-span-2 lg:col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">SMTP Host</Label>
                                        <Input
                                            placeholder="smtp.resend.com"
                                            value={smtpConfig.host}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                            className="bg-muted/40 border-none rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 lg:col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Port</Label>
                                        <Input
                                            type="number"
                                            placeholder="465"
                                            value={smtpConfig.port}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 0 })}
                                            className="bg-muted/40 border-none rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 lg:col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">From Email</Label>
                                        <Input
                                            placeholder="noreply@fyndfuel.com"
                                            value={smtpConfig.fromEmail}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                                            className="bg-muted/40 border-none rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 lg:col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">From Name</Label>
                                        <Input
                                            placeholder="Fynd Fuel Support"
                                            value={smtpConfig.fromName}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                                            className="bg-muted/40 border-none rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 lg:col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">SMTP User</Label>
                                        <Input
                                            placeholder="api_key_name"
                                            value={smtpConfig.user}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                                            className="bg-muted/40 border-none rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 lg:col-span-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">SMTP Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={smtpConfig.password}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                                            className="bg-muted/40 border-none rounded-xl"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="template" className="space-y-6 m-0">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Brand Color</Label>
                                            <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-xl pr-3">
                                                <input
                                                    type="color"
                                                    value={templateSettings.headerColor}
                                                    onChange={(e) => setTemplateSettings({ ...templateSettings, headerColor: e.target.value })}
                                                    className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent flex-shrink-0"
                                                />
                                                <Input
                                                    value={templateSettings.headerColor}
                                                    onChange={(e) => setTemplateSettings({ ...templateSettings, headerColor: e.target.value })}
                                                    className="h-9 border-none bg-transparent font-mono text-sm p-0 focus-visible:ring-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Greeting</Label>
                                            <Input
                                                placeholder="Hello"
                                                value={templateSettings.greetingPrefix}
                                                onChange={(e) => setTemplateSettings({ ...templateSettings, greetingPrefix: e.target.value })}
                                                className="bg-muted/40 border-none rounded-xl h-11"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Logo Text / Heading</Label>
                                        <Input
                                            placeholder="e.g. FYND FUEL"
                                            value={templateSettings.logoText}
                                            onChange={(e) => setTemplateSettings({ ...templateSettings, logoText: e.target.value })}
                                            className="bg-muted/40 border-none rounded-xl h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Logo URL</Label>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 text-[9px] font-black uppercase tracking-tighter text-primary hover:bg-primary/5"
                                                onClick={() => setTemplateSettings({ ...templateSettings, logoImageUrl: '/logo.png' })}
                                            >
                                                Use Default Logo
                                            </Button>
                                        </div>
                                        <div className="relative group">
                                            <Input
                                                placeholder="https://your-domain.com/logo.png"
                                                value={templateSettings.logoImageUrl}
                                                onChange={(e) => setTemplateSettings({ ...templateSettings, logoImageUrl: e.target.value })}
                                                className="bg-muted/40 border-none rounded-xl h-11 pr-10"
                                            />
                                            {templateSettings.logoImageUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-2 top-1.5 h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setTemplateSettings({ ...templateSettings, logoImageUrl: '' })}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {/* Logo Preview */}
                                        {templateSettings.logoImageUrl && (
                                            <div className="mt-4 p-4 rounded-2xl bg-muted/20 border border-dashed border-muted-foreground/20 flex flex-col items-center gap-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Logo Preview</p>
                                                <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl shadow-sm max-w-full overflow-hidden flex items-center justify-center">
                                                    <img 
                                                        src={templateSettings.logoImageUrl} 
                                                        alt="Logo Preview" 
                                                        className="max-h-12 max-w-[200px] object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/200x50?text=Invalid+Logo+URL'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Footer Disclaimer</Label>
                                        <Textarea
                                            placeholder="Copyright information, address, etc."
                                            value={templateSettings.footerText}
                                            onChange={(e) => setTemplateSettings({ ...templateSettings, footerText: e.target.value })}
                                            className="bg-muted/40 border-none rounded-xl min-h-[100px] resize-none p-4"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>

                        <DialogFooter className="px-8 py-5 bg-muted/20 border-t flex items-center justify-between sm:justify-between">
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
                                All changes are stored securely
                            </p>
                            <div className="flex items-center gap-3">
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-bold text-[11px] hover:bg-muted/40">CANCEL</Button>
                                </DialogTrigger>
                                <Button 
                                    onClick={saveSettings} 
                                    disabled={isSavingSmtp}
                                    className="h-10 px-8 rounded-xl bg-primary shadow-lg shadow-primary/20 gap-2"
                                >
                                    {isSavingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    <span className="font-bold text-[11px] uppercase tracking-wider">Deploy Settings</span>
                                </Button>
                            </div>
                        </DialogFooter>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    )
}
