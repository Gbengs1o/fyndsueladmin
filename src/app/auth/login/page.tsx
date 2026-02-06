'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            })

            if (error) throw error

            // Check verification status
            const { data: profile } = await supabase
                .from('manager_profiles')
                .select('verification_status')
                .eq('id', data.user.id)
                .single()

            if (profile?.verification_status === 'verified') {
                router.push('/dashboard')
            } else {
                router.push('/auth/verify')
            }
        } catch (err: any) {
            setError(err.message || 'Invalid login credentials')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="bg-[#111] border-gray-800 text-white">
            <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription className="text-gray-400">Log in to your manager account</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="manager@station.com"
                            className="bg-[#1a1a1a] border-gray-700 focus:border-emerald-500 transition-colors"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="password" className="text-gray-300">Password</Label>
                            <Link href="#" className="text-xs text-emerald-500 hover:underline">Forgot password?</Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            className="bg-[#1a1a1a] border-gray-700"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Logging In...' : 'Log In'}
                    </Button>
                    <div className="text-center text-sm text-gray-400">
                        Don't have an account?{' '}
                        <Link href="/auth/signup" className="text-emerald-500 hover:underline">
                            Sign Up
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </Card>
    )
}
