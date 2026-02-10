import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // 1. If not logged in and trying to access protected routes
    if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/auth/verify'))) {
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
    }

    // 2. If logged in
    if (user) {
        // Redirect away from auth pages if logged in
        if (pathname === '/auth/login' || pathname === '/auth/signup') {
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // --- Manager Registration Flow ---
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        // 3. Force Station Registration if role is 'manager' but no profile exists
        if (profile?.role === 'manager' && !pathname.startsWith('/auth/register-station')) {
            const { data: managerProfile } = await supabase
                .from('manager_profiles')
                .select('verification_status')
                .eq('id', user.id)
                .single()

            // If they are a manager but haven't registered a station yet
            if (!managerProfile) {
                url.pathname = '/auth/register-station'
                return NextResponse.redirect(url)
            }

            // If they are pending approval
            if (managerProfile.verification_status === 'pending' && !pathname.startsWith('/dashboard/pending-approval')) {
                url.pathname = '/dashboard/pending-approval'
                return NextResponse.redirect(url)
            }

            // If they are fully approved, they shouldn't be on the pending page
            if (managerProfile.verification_status === 'verified' && pathname.startsWith('/dashboard/pending-approval')) {
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }
        }
    }

    return response
}

export const config = {
    matcher: ['/dashboard/:path*', '/auth/:path*'],
}
