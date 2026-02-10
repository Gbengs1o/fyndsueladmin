'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Fuel, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function RegisterStationPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [fetchingLocation, setFetchingLocation] = useState(false)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [nearbyStations, setNearbyStations] = useState<any[]>([])
    const [selectedStation, setSelectedStation] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)

    // 1. Get User Location
    const requestLocation = () => {
        setFetchingLocation(true)
        setError(null)

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser')
            setFetchingLocation(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                setLocation({ lat: latitude, lng: longitude })
                fetchNearbyStations(latitude, longitude)
                setFetchingLocation(false)
            },
            (err) => {
                setError('Unable to retrieve your location. Please ensure you are at the station.')
                setFetchingLocation(false)
                console.error(err)
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
    }

    // 2. Fetch Stations within 2km (Using PostGIS RPC or simple lat/lng box if RPC unavailable)
    const fetchNearbyStations = async (lat: number, lng: number) => {
        setLoading(true)
        try {
            // Simple bounding box approximation for 2km (roughly 0.018 degrees)
            const range = 0.018

            const { data, error } = await supabase
                .from('stations')
                .select('*')
                .gte('latitude', lat - range)
                .lte('latitude', lat + range)
                .gte('longitude', lng - range)
                .lte('longitude', lng + range)
                .limit(20)

            if (error) throw error

            // Calculate exact distance client-side for precision
            const stationsWithDist = data?.map(station => {
                const dist = getDistanceFromLatLonInKm(lat, lng, station.latitude, station.longitude)
                return { ...station, distance: dist }
            }).filter(s => s.distance <= 2) // Filter strictly to 2km
                .sort((a, b) => a.distance - b.distance)

            setNearbyStations(stationsWithDist || [])
        } catch (err: any) {
            toast.error('Failed to fetch nearby stations')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // 3. Submit Registration Request
    const handleRegister = async () => {
        if (!selectedStation) return
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Create Manager Profile with Pending Status
            const { error: profileError } = await supabase
                .from('manager_profiles')
                .upsert({
                    id: user.id,
                    station_id: selectedStation.id,
                    verification_status: 'pending',
                    full_name: user.user_metadata?.full_name || 'Manager',
                    phone_number: user.user_metadata?.phone || '',
                })

            if (profileError) throw profileError

            toast.success('Registration submitted! Verification pending approval.')
            router.push('/dashboard/pending-approval') // Redirect to a waiting screen
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    // Haversine Formula for distance
    function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                        <Fuel className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Claim Your Station</h1>
                    <p className="text-muted-foreground mt-2">
                        Register as a manager. You must be physically present at the station.
                    </p>
                </div>

                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>Step 1: Verify Location</CardTitle>
                        <CardDescription>We need to confirm you are at the station.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!location ? (
                            <Button
                                className="w-full h-12 text-base"
                                onClick={requestLocation}
                                disabled={fetchingLocation}
                            >
                                {fetchingLocation ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Getting Location...
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="mr-2 h-4 w-4" />
                                        I am at the Station
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                                <span className="flex items-center gap-2 font-medium">
                                    <CheckCircle2 className="w-4 h-4" /> Location Verified
                                </span>
                                <span className="text-xs opacity-75">Accuracy: High</span>
                            </div>
                        )}
                        {error && (
                            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>



                {/* Manual Search Fallback */}
                <div className="text-center">
                    <button
                        onClick={() => {
                            const input = prompt("Enter City (e.g., Ibadan) OR Coordinates (lat,lng):")
                            if (input) {
                                let lat = 7.3775, lng = 3.9470 // Default

                                // Check if input is coordinates "7.37, 3.94"
                                if (input.includes(',')) {
                                    const [l, g] = input.split(',').map(s => parseFloat(s.trim()))
                                    if (!isNaN(l) && !isNaN(g)) {
                                        lat = l
                                        lng = g
                                    }
                                } else {
                                    // City fallback
                                    if (input.toLowerCase().includes('lagos')) { lat = 6.5244; lng = 3.3792 }
                                    if (input.toLowerCase().includes('abuja')) { lat = 9.0765; lng = 7.3986 }
                                    if (input.toLowerCase().includes('ibadan')) { lat = 7.3775; lng = 3.9470 }
                                }

                                setLocation({ lat, lng })
                                fetchNearbyStations(lat, lng)
                            }
                        }}
                        className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
                    >
                        Browser location wrong? Enter Coordinates Manually
                    </button>
                </div>

                {location && (
                    <Card className="border-border animate-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <CardTitle>Step 2: Select Station</CardTitle>
                            <CardDescription>Found {nearbyStations.length} stations within 2km</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            ) : nearbyStations.length > 0 ? (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {nearbyStations.map((station) => (
                                        <div
                                            key={station.id}
                                            onClick={() => setSelectedStation(station)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedStation?.id === station.id
                                                ? 'border-primary bg-primary/10 shadow-sm'
                                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className={`font-bold ${selectedStation?.id === station.id ? 'text-primary' : 'text-foreground'}`}>
                                                        {station.name}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{station.address}</p>
                                                </div>
                                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                                                    {station.distance.toFixed(2)}km
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No stations found nearby.</p>
                                    <Button variant="link" className="text-primary mt-2">Create New Station Request</Button>
                                </div>
                            )}

                            <Button
                                className="w-full h-12 mt-4 text-base font-bold"
                                disabled={!selectedStation || loading}
                                onClick={handleRegister}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                                {loading ? 'Submitting...' : 'Submit for Approval'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div >
    )
}
