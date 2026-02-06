'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, CheckCircle2, Clock, XCircle, UploadCloud } from 'lucide-react'

export default function VerifyPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [uploading, setUploading] = useState(false)
    const [status, setStatus] = useState<'pending' | 'verified' | 'rejected' | 'none'>('none')

    useEffect(() => {
        async function getProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/login')
                return
            }
            setUser(user)

            const { data } = await supabase
                .from('manager_profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setProfile(data)
                setStatus(data.verification_status || 'none')
                if (data.verification_status === 'verified') {
                    router.push('/dashboard')
                }
            }
        }
        getProfile()
    }, [router])

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `verifications/${fileName}`

            // Upload to station-verifications bucket
            const { error: uploadError } = await supabase.storage
                .from('station-verifications')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('station-verifications')
                .getPublicUrl(filePath)

            // Update profile
            const { error: updateError } = await supabase
                .from('manager_profiles')
                .update({
                    verification_photo_url: publicUrl,
                    verification_status: 'pending'
                })
                .eq('id', user.id)

            if (updateError) throw updateError

            setStatus('pending')
            alert('Photo uploaded successfully! Please wait for admin review.')
        } catch (error: any) {
            alert(error.message)
        } finally {
            setUploading(false)
        }
    }

    if (!profile) return <div className="text-white">Loading...</div>

    return (
        <Card className="bg-[#111] border-gray-800 text-white">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-gray-800">
                    {status === 'verified' && <CheckCircle2 className="text-emerald-500 w-8 h-8" />}
                    {status === 'pending' && <Clock className="text-amber-500 w-8 h-8" />}
                    {status === 'rejected' && <XCircle className="text-red-500 w-8 h-8" />}
                    {status === 'none' && <Camera className="text-blue-500 w-8 h-8" />}
                </div>
                <CardTitle>
                    {status === 'verified' ? 'Account Verified' :
                        status === 'pending' ? 'Verification Pending' :
                            status === 'rejected' ? 'Verification Rejected' : 'Verify Your Identity'}
                </CardTitle>
                <CardDescription className="text-gray-400">
                    {status === 'verified' ? 'Your account is ready for use.' :
                        status === 'pending' ? 'An admin is reviewing your station photo.' :
                            status === 'rejected' ? 'Your photo was rejected. Please upload a clear photo of your price board.' :
                                'Upload a photo of your station\'s physical price board.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {(status === 'none' || status === 'rejected') && (
                    <div className="border-2 border-dashed border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center transition-colors hover:border-emerald-500/50 group">
                        <input
                            type="file"
                            id="photo-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label
                            htmlFor="photo-upload"
                            className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                            <UploadCloud className="w-12 h-12 text-gray-600 group-hover:text-emerald-500 transition-colors" />
                            <span className="text-sm text-gray-400 group-hover:text-gray-300">
                                {uploading ? 'Uploading...' : 'Click to take a photo or upload'}
                            </span>
                        </label>
                    </div>
                )}

                {status === 'pending' && (
                    <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 text-amber-500 text-sm flex items-start gap-3">
                        <Clock className="w-5 h-5 mt-0.5 shrink-0" />
                        <p>Verification usually takes less than 24 hours. You will gain access to the dashboard once approved.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    variant="outline"
                    className="w-full border-gray-800 hover:bg-gray-800 text-gray-300"
                    onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
                >
                    Sign Out
                </Button>
            </CardFooter>
        </Card>
    )
}
