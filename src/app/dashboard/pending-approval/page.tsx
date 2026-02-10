'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Clock, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function PendingApprovalPage() {
    const router = useRouter()
    const [isChecking, setIsChecking] = useState(false)
    const [status, setStatus] = useState('pending')

    const checkStatus = async () => {
        setIsChecking(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('manager_profiles')
            .select('verification_status')
            .eq('id', user.id)
            .single()

        if (data?.verification_status === 'verified') {
            setStatus('verified')
            toast.success('You are approved! Redirecting...')
            setTimeout(() => {
                window.location.href = '/dashboard' // Force full reload to update layout state
            }, 1000)
        } else if (data?.verification_status === 'rejected') {
            setStatus('rejected')
        }

        setIsChecking(false)
    }

    // Auto-check every 10 seconds
    useEffect(() => {
        checkStatus()
        const interval = setInterval(checkStatus, 10000)
        return () => clearInterval(interval)
    }, [])

    if (status === 'verified') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 animate-im-pulse">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Account Verified!</h1>
                <p className="text-muted-foreground mb-8">Accessing your dashboard...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Clock className="w-10 h-10 text-yellow-500" />
            </div>

            <h1 className="text-3xl font-bold mb-4">Verification in Progress</h1>

            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mb-8 text-left space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">1</div>
                    <div>
                        <h4 className="font-semibold">Request Submitted</h4>
                        <p className="text-xs text-muted-foreground">We received your details.</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                </div>
                <div className="w-0.5 h-6 bg-border ml-4"></div>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-sm font-bold animate-pulse">2</div>
                    <div>
                        <h4 className="font-semibold">Admin Review</h4>
                        <p className="text-xs text-muted-foreground">Checking station details...</p>
                    </div>
                    {isChecking && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin ml-auto" />}
                </div>
                <div className="w-0.5 h-6 bg-border ml-4 opacity-50"></div>
                <div className="flex items-center gap-4 opacity-50">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">3</div>
                    <div>
                        <h4 className="font-semibold">Access Granted</h4>
                        <p className="text-xs text-muted-foreground">Dashboard unlocks automatically.</p>
                    </div>
                </div>
            </div>

            <p className="text-muted-foreground max-w-md mb-8 text-sm">
                This page will automatically update once you are approved.
                <br />
                You usually don't have to wait long.
            </p>

            <div className="flex gap-4">
                <Button variant="outline" onClick={checkStatus} disabled={isChecking} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                    Check Status
                </Button>
                <Link href="/">
                    <Button variant="ghost" className="gap-2">
                        Back Home
                    </Button>
                </Link>
            </div>
        </div>
    )
}
