"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon, Loader2, Upload, X, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { supabase } from "@/lib/supabase"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Schema
const advertSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    type: z.enum(["image", "video"]),
    cta_text: z.string().optional(),
    cta_link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    display_duration: z.coerce.number().min(1, "Duration must be at least 1 second").default(5),
    priority: z.coerce.number().default(0),
    start_date: z.date({ required_error: "Start date is required" }),
    end_date: z.date({ required_error: "End date is required" }),
})

interface Advert {
    id: string
    title: string
    type: 'image' | 'video'
    content_url: string
    start_date: string
    end_date: string
    target_locations: string[] | null
    is_active: boolean
    priority: number
    cta_text: string | null
    cta_link: string | null
    display_duration: number
    created_at: string
}

interface EditAdvertDialogProps {
    advert: Advert | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
    "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
    "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
].sort()

export function EditAdvertDialog({ advert, open, onOpenChange, onSuccess }: EditAdvertDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isCheckingConflict, setIsCheckingConflict] = useState(false)
    const [conflictError, setConflictError] = useState<string | null>(null)

    const [selectedLocations, setSelectedLocations] = useState<string[]>([])
    const [isAllNigeria, setIsAllNigeria] = useState(false)

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof advertSchema>>({
        resolver: zodResolver(advertSchema),
        defaultValues: {
            title: "",
            type: "image",
            cta_text: "",
            cta_link: "",
            display_duration: 5,
            priority: 0,
        },
    })

    // Populate form when advert changes
    useEffect(() => {
        if (advert) {
            form.reset({
                title: advert.title,
                type: advert.type,
                cta_text: advert.cta_text || "",
                cta_link: advert.cta_link || "",
                display_duration: advert.display_duration,
                priority: advert.priority,
                start_date: new Date(advert.start_date),
                end_date: new Date(advert.end_date),
            })

            // Setup locations
            if (advert.target_locations && advert.target_locations.length > 0) {
                // Check if it's effectively "All Nigeria" (all 37 states)
                // Or we could trust the UI interaction. 
                // If the array matches NIGERIAN_STATES length and content, set isAllNigeria to true
                const isAll = advert.target_locations.length === NIGERIAN_STATES.length &&
                    advert.target_locations.every(l => NIGERIAN_STATES.includes(l));

                setIsAllNigeria(isAll);
                setSelectedLocations(advert.target_locations);
            } else {
                // Fallback if null or empty (legacy logic usually implies all, but let's stick to explicit)
                setIsAllNigeria(false);
                setSelectedLocations([]);
            }

            // Setup preview
            setPreviewUrl(advert.content_url)
            setSelectedFile(null)
        }
    }, [advert, form])

    const advertType = form.watch("type")

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleLocationToggle = (location: string) => {
        if (isAllNigeria) return
        setSelectedLocations(prev =>
            prev.includes(location)
                ? prev.filter(l => l !== location)
                : [...prev, location]
        )
    }

    const toggleAllNigeria = (checked: boolean) => {
        setIsAllNigeria(checked)
        if (checked) {
            setSelectedLocations([...NIGERIAN_STATES])
        } else {
            setSelectedLocations([])
        }
    }

    const checkConflicts = async (startDate: Date, endDate: Date, locations: string[]): Promise<string | null> => {
        if (!advert) return "System error: No advert selected"

        // 1. Fetch all active ads that overlap with the time range, EXCLUDING the current one
        const { data: overlappingAds, error } = await supabase
            .from('adverts')
            .select('id, title, target_locations, start_date, end_date')
            .eq('is_active', true)
            .neq('id', advert.id) // Exclude current advert
            .lte('start_date', endDate.toISOString())
            .gte('end_date', startDate.toISOString())

        if (error) {
            console.error("Error checking conflicts:", error)
            return "Could not verify schedule conflicts. Please try again."
        }

        if (!overlappingAds || overlappingAds.length === 0) return null

        // 2. Check for location overlap
        const proposedLocations = isAllNigeria ? NIGERIAN_STATES : locations

        for (const ad of overlappingAds) {
            const existingLocations = ad.target_locations || []
            const hasOverlap = proposedLocations.some(loc => existingLocations.includes(loc))

            if (hasOverlap) {
                return `Conflict detected: Campaign "${ad.title}" is already running in overlapping locations during this time.`
            }
        }

        return null
    }

    const onSubmit = async (values: z.infer<typeof advertSchema>) => {
        if (!advert) return
        setConflictError(null)

        if (!isAllNigeria && selectedLocations.length === 0) {
            toast({ variant: "destructive", title: "Location Required", description: "Please select at least one location or 'All Nigeria'." })
            return
        }

        try {
            setIsLoading(true)
            setIsCheckingConflict(true)

            // Check for conflicts
            const conflictMsg = await checkConflicts(values.start_date, values.end_date, selectedLocations)
            if (conflictMsg) {
                setConflictError(conflictMsg)
                setIsCheckingConflict(false)
                setIsLoading(false)
                return
            }
            setIsCheckingConflict(false)

            let contentUrl = advert.content_url;
            const typeChanged = values.type !== advert.type;

            if (values.type === "image") {
                if (selectedFile) {
                    const uploadResult = await uploadToCloudinary(selectedFile)
                    contentUrl = uploadResult.secure_url
                } else if (typeChanged) {
                    toast({ variant: "destructive", title: "Image Required", description: "Please upload an image for the advert." })
                    setIsLoading(false)
                    return
                }
            } else {
                // Video Type
                if (selectedFile) {
                    const uploadResult = await uploadToCloudinary(selectedFile)
                    contentUrl = uploadResult.secure_url
                } else if (typeChanged) {
                    toast({ variant: "destructive", title: "Video Required", description: "Please upload a video for the advert." })
                    setIsLoading(false)
                    return
                }
            }

            const { error } = await supabase.from("adverts").update({
                title: values.title,
                type: values.type,
                content_url: contentUrl,
                cta_text: values.cta_text || null,
                cta_link: values.cta_link || null,
                display_duration: values.display_duration,
                priority: values.priority,
                start_date: values.start_date.toISOString(),
                end_date: values.end_date.toISOString(),
                target_locations: isAllNigeria ? NIGERIAN_STATES : selectedLocations,
            }).eq('id', advert.id)

            if (error) throw error

            toast({ title: "Success", description: "Advert updated successfully!" })
            form.reset()
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast({ variant: "destructive", title: "Error", description: error.message || "Something went wrong" })
        } finally {
            setIsLoading(false)
            setIsCheckingConflict(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Advert</DialogTitle>
                    <DialogDescription>
                        Modify your advertisement campaign.
                    </DialogDescription>
                </DialogHeader>

                {conflictError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Schedule Conflict</AlertTitle>
                        <AlertDescription>{conflictError}</AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Campaign Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Summer Promo" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority (0-10)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>Higher shows first</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Advert Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="image" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Image Banner</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="video" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Video (YouTube)</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {advertType === "image" ? (
                            <FormItem>
                                <FormLabel>Advert Image (Cloudinary)</FormLabel>
                                <FormControl>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-4 border-2 border-dashed rounded-md p-6 justify-center bg-muted/50">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="image-upload-edit"
                                            />
                                            <label htmlFor="image-upload-edit" className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Click to upload new image (optional)</span>
                                            </label>
                                        </div>
                                        {previewUrl && (
                                            <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden border">
                                                <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                            </FormItem>
                        ) : (
                            <FormItem>
                                <FormLabel>Advert Video (Upload)</FormLabel>
                                <FormControl>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-4 border-2 border-dashed rounded-md p-6 justify-center bg-muted/50">
                                            <Input
                                                type="file"
                                                accept="video/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="video-upload-edit"
                                            />
                                            <label htmlFor="video-upload-edit" className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Click to upload new video (optional)</span>
                                            </label>
                                        </div>
                                        {previewUrl && (
                                            <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden border">
                                                <video src={previewUrl} controls className="object-cover w-full h-full" />
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="cta_text"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Call to Action text</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Learn More" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cta_link"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Call to Action URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="display_duration"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Duration (Seconds)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormDescription>How long the ad stays on screen (image only)</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Start Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="end_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>End Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormItem>
                            <div className="flex items-center justify-between mb-2">
                                <FormLabel>Target Locations</FormLabel>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="all-nigeria-edit"
                                        checked={isAllNigeria}
                                        onCheckedChange={toggleAllNigeria}
                                    />
                                    <label
                                        htmlFor="all-nigeria-edit"
                                        className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                        Select All Nigeria
                                    </label>
                                </div>
                            </div>

                            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {NIGERIAN_STATES.map((location) => (
                                        <div key={location} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`loc-edit-${location}`}
                                                checked={selectedLocations.includes(location)}
                                                onCheckedChange={() => handleLocationToggle(location)}
                                                disabled={isAllNigeria}
                                            />
                                            <label
                                                htmlFor={`loc-edit-${location}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {location}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <FormDescription>Select locations. "All Nigeria" selects all states.</FormDescription>
                        </FormItem>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isCheckingConflict ? "Checking..." : "Update Advert"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
