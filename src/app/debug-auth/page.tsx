"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugAuthPage() {
    const [envCheck, setEnvCheck] = useState<any>({})
    const [connectionStatus, setConnectionStatus] = useState<string>("Not tested")
    const [latency, setLatency] = useState<number | null>(null)
    const [authStatus, setAuthStatus] = useState<string>("Unknown")

    useEffect(() => {
        // Check Env Vars
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        setEnvCheck({
            url: url ? `Defined (${url.substring(0, 15)}...)` : "Missing",
            key: key ? `Defined (${key.substring(0, 10)}...)` : "Missing",
        })

        // Check Auth Session
        supabase.auth.getSession().then(({ data }) => {
            setAuthStatus(data.session ? "Has Session" : "No Session")
        })
    }, [])

    const testConnection = async () => {
        setConnectionStatus("Testing SDK...")
        // Test 1: SDK
        try {
            const { data, error, count } = await supabase
                .from("stations")
                .select("id", { count: "exact", head: true })
                .abortSignal(AbortSignal.timeout(5000)) // 5s timeout

            if (error) {
                setConnectionStatus(`SDK Error: ${error.message}`)
            } else {
                setConnectionStatus(`SDK Success! (Found ${count} stations)`)
            }
        } catch (err: any) {
            setConnectionStatus(`SDK Exception: ${err.message}`)
        }

        // Test 2: Raw Fetch (Bypassing SDK)
        setTimeout(async () => {
            setConnectionStatus(prev => prev + " | Testing Raw Fetch...")
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stations?select=id&limit=1`, {
                    headers: {
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
                    },
                    signal: AbortSignal.timeout(5000)
                })

                if (res.ok) {
                    setConnectionStatus(prev => prev.replace("Testing Raw Fetch...", "Raw Fetch Success!"))
                } else {
                    setConnectionStatus(prev => prev.replace("Testing Raw Fetch...", `Raw Fetch Failed: ${res.status}`))
                }
            } catch (e: any) {
                setConnectionStatus(prev => prev.replace("Testing Raw Fetch...", `Raw Fetch Error: ${e.message}`))
            }
        }, 1000)
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Supabase Connectivity Debugger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 border p-4 rounded bg-muted/20">
                        <div className="font-semibold">Supabase URL:</div>
                        <div className="font-mono text-sm">{envCheck.url}</div>
                        <div className="font-semibold">Anon Key:</div>
                        <div className="font-mono text-sm">{envCheck.key}</div>
                    </div>

                    <div className="border p-4 rounded space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Connection Test:</span>
                            <span className={connectionStatus.startsWith("Success") ? "text-green-600 font-bold" : "text-amber-600"}>
                                {connectionStatus}
                            </span>
                        </div>
                        {latency && <div>Latency: {latency}ms</div>}
                        <Button onClick={testConnection} className="w-full mt-2">Test Database Connection</Button>
                    </div>

                    <div className="border p-4 rounded">
                        <div className="font-semibold">Current Auth Status: {authStatus}</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
