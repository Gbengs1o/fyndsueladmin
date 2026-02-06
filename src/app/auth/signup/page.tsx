'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

export default function SignUpPage() {
    const router = useRouter()
    const [stations, setStations] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phoneNumber: '',
        stationId: '',
    })

    useEffect(() => {
        async function fetchStations() {
            const { data, error } = await supabase
                .from('stations')
                .select('id, name, address, state')
                .order('name', { ascending: true })
                .limit(100)

            if (data) setStations(data)
        }
        fetchStations()
    }, [])

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        phone_number: formData.phoneNumber,
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Failed to create user')

            // 2. Create Manager Profile
            const { error: profileError } = await supabase
                .from('manager_profiles')
                .insert([
                    {
                        id: authData.user.id,
                        full_name: formData.fullName,
                        phone_number: formData.phoneNumber,
                        station_id: parseInt(formData.stationId),
                        verification_status: 'pending'
                    }
                ])

            if (profileError) throw profileError

            // 3. Redirect to Verification Photo Upload
            router.push('/auth/verify')
        } catch (err: any) {
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="bg-[#111] border-gray-800 text-white">
            <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription className="text-gray-400">Join FyndFuel to manage your station</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                        <Input
                            id="fullName"
                            placeholder="John Doe"
                            className="bg-[#1a1a1a] border-gray-700 focus:border-emerald-500 transition-colors"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="manager@station.com"
                                className="bg-[#1a1a1a] border-gray-700"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-gray-300">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                placeholder="+234..."
                                className="bg-[#1a1a1a] border-gray-700"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-300">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            className="bg-[#1a1a1a] border-gray-700"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="station" className="text-gray-300">Select Your Station</Label>
                        <Select onValueChange={(val) => setFormData({ ...formData, stationId: val })}>
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                                <SelectValue placeholder="Select a station" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white">
                                {stations.map((station) => (
                                    <SelectItem key={station.id} value={station.id.toString()}>
                                        {station.name} - {station.state}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                    <div className="text-center text-sm text-gray-400">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-emerald-500 hover:underline">
                            Log In
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </Card>
    )
}
