"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, User, X } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"

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
    const [selectedUsersData, setSelectedUsersData] = React.useState<User[]>([])
    const [loading, setLoading] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    // Fetch search results
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

    // Fetch details for selected users to show names in badges
    React.useEffect(() => {
        async function fetchSelectedDetails() {
            if (value.length === 0) {
                setSelectedUsersData([])
                return
            }

            // Filter out IDs we already have data for
            const missingIds = value.filter(id => !selectedUsersData.some(u => u.id === id))

            if (missingIds.length === 0) return

            try {
                const res = await fetch('/api/users/by-ids', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: missingIds })
                })

                if (res.ok) {
                    const newData = await res.json()
                    setSelectedUsersData(prev => [...prev, ...newData].filter(u => value.includes(u.id)))
                }
            } catch (error) {
                console.error("Error fetching selected users details:", error)
            }
        }

        fetchSelectedDetails()
    }, [value])

    const handleSelect = (userId: string) => {
        if (value.includes(userId)) {
            onChange(value.filter(id => id !== userId))
        } else {
            onChange([...value, userId])
        }
    }

    const removeUser = (userId: string) => {
        onChange(value.filter(id => id !== userId))
    }

    const clearAll = () => {
        onChange([])
    }

    return (
        <div className="space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-[40px]"
                    >
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 opacity-50" />
                            <span>{value.length > 0 ? `${value.length} users selected` : "Search and select users..."}</span>
                        </div>
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

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 rounded-md border bg-muted/30">
                    {value.map(userId => {
                        const userData = selectedUsersData.find(u => u.id === userId)
                        return (
                            <Badge key={userId} variant="secondary" className="pl-1 pr-1 py-0.5 flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                    <AvatarImage src={userData?.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]"><User className="h-2 w-2" /></AvatarFallback>
                                </Avatar>
                                <span className="max-w-[120px] truncate text-[11px]">
                                    {userData?.full_name || 'Loading...'}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeUser(userId);
                                    }}
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        )
                    })}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                    >
                        Clear All
                    </Button>
                </div>
            )}
        </div>
    )
}
