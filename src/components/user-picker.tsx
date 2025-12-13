"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
}

interface UserPickerProps {
    value: string[]
    onChange: (value: string[]) => void
}

export function UserPicker({ value, onChange }: UserPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [users, setUsers] = React.useState<User[]>([])
    const [loading, setLoading] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    React.useEffect(() => {
        async function fetchUsers() {
            if (!debouncedSearch) {
                setUsers([])
                return
            }
            setLoading(true)
            try {
                const res = await fetch(`/api/users/search?q=${debouncedSearch}`)
                if (res.ok) {
                    const data = await res.json()
                    setUsers(data)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [debouncedSearch])

    const handleSelect = (userId: string) => {
        // For now, let's treat it as single select to start, or multi if requested. 
        // User said: "user list should show". 
        // Current API supports array, so let's do simple toggle
        if (value.includes(userId)) {
            onChange(value.filter(id => id !== userId))
        } else {
            onChange([...value, userId])
        }
    }

    // Fetch selected users details if needed (omitted for simplicity, assuming user searches)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto"
                >
                    {value.length > 0
                        ? `${value.length} users selected`
                        : "Search and select users..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="Search name or email..." onValueChange={setSearch} />
                    <CommandList>
                        {loading && <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>}
                        {!loading && users.length === 0 && <CommandEmpty>Start typing to search users.</CommandEmpty>}
                        <CommandGroup>
                            {!loading && users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.id}
                                    onSelect={() => handleSelect(user.id)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value.includes(user.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={user.avatar_url || undefined} />
                                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{user.full_name || 'No Name'}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
