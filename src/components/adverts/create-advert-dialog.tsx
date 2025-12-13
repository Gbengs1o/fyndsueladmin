"use client"

import { useState } from "react"
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
    DialogTrigger,
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

interface CreateAdvertDialogProps {
    onSuccess: () => void
}

const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
    "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
    "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
].sort()

export function CreateAdvertDialog({ onSuccess }: CreateAdvertDialogProps) {
    const [open, setOpen] = useState(false)
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
        // 1. Fetch all active ads that overlap with the time range
        const { data: overlappingAds, error } = await supabase
            .from('adverts')
            .select('title, target_locations, start_date, end_date')
            .eq('is_active', true)
            .lte('start_date', endDate.toISOString()) // existing start <= new end
            .gte('end_date', startDate.toISOString()) // existing end >= new start

        if (error) {
            console.error("Error checking conflicts:", error)
            return "Could not verify schedule conflicts. Please try again."
        }

        if (!overlappingAds || overlappingAds.length === 0) return null

        // 2. Check for location overlap
        const proposedLocations = isAllNigeria ? NIGERIAN_STATES : locations

        for (const ad of overlappingAds) {
            // If the existing ad covers "All Nigeria" (which we might store as null or special flag, but currently we just check if it includes all or we strictly check 1-to-1).
            // Ideally, robust logic checks intersection. 
            const existingLocations = ad.target_locations || []

            // If existing ad has NO specific locations, it might mean global/all (depending on your logic). 
            // Assuming 'target_locations' being null means ALL Nigeria for simplicty, OR existing logic stored all states.
            // Let's assume explicit list for now.

            const hasOverlap = proposedLocations.some(loc => existingLocations.includes(loc))

            if (hasOverlap) {
                return `Conflict detected: Campaign "${ad.title}" is already running in overlapping locations during this time.`
            }
        }

        return null
    }

    const onSubmit = async (values: z.infer<typeof advertSchema>) => {
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

            let contentUrl = values.video_url

            // Handle Image Upload
            if (values.type === "image") {
                if (!selectedFile) {
                    toast({ variant: "destructive", title: "Image Required", description: "Please upload an image for the advert." })
                    setIsLoading(false)
                    return
                }
                const uploadResult = await uploadToCloudinary(selectedFile)
                contentUrl = uploadResult.secure_url
            } else {
                if (!selectedFile) {
                    toast({ variant: "destructive", title: "Video Required", description: "Please upload a video for the advert." })
                    setIsLoading(false)
                    return
                }
                const uploadResult = await uploadToCloudinary(selectedFile)
                contentUrl = uploadResult.secure_url
            }

            const { error } = await supabase.from("adverts").insert({
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
                is_active: true,
            })

            if (error) throw error

            toast({ title: "Success", description: "Advert created successfully!" })
            setOpen(false)
            form.reset()
            setSelectedFile(null)
            setPreviewUrl(null)
            setSelectedLocations([])
            setIsAllNigeria(false)
            onSuccess()
        } catch (error: any) {
            console.error(error)
            toast({ variant: "destructive", title: "Error", description: error.message || "Something went wrong" })
        } finally {
            setIsLoading(false)
            setIsCheckingConflict(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Create Advert</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Advert</DialogTitle>
                    <DialogDescription>
                        Create a new advertisement campaign. conflicting schedules in the same location are not allowed.
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
                                                id="image-upload"
                                            />
                                            <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Click to upload image</span>
                                            </label>
                                        </div>
                                        {previewUrl && (
                                            <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden border">
                                                <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute top-2 right-2 h-6 w-6"
                                                    onClick={() => {
                                                        setPreviewUrl(null);
                                                        setSelectedFile(null);
                                                    }}
                                                    type="button"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
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
                                                id="video-upload"
                                            />
                                            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Click to upload video</span>
                                            </label>
                                        </div>
                                        {previewUrl && (
                                            <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden border">
                                                <video src={previewUrl} controls className="object-cover w-full h-full" />
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute top-2 right-2 h-6 w-6"
                                                    onClick={() => {
                                                        setPreviewUrl(null);
                                                        setSelectedFile(null);
                                                    }}
                                                    type="button"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
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
                                    <FormDescription>How long the ad stays on screen (mostly for images)</FormDescription>
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
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                                        id="all-nigeria"
                                        checked={isAllNigeria}
                                        onCheckedChange={toggleAllNigeria}
                                    />
                                    <label
                                        htmlFor="all-nigeria"
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
                                                id={`loc-${location}`}
                                                checked={selectedLocations.includes(location)}
                                                onCheckedChange={() => handleLocationToggle(location)}
                                                disabled={isAllNigeria}
                                            />
                                            <label
                                                htmlFor={`loc-${location}`}
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
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isCheckingConflict ? "Checking..." : "Create Advert"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
