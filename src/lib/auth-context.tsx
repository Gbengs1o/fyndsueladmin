"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { useRouter } from "next/navigation"

interface AdminUser {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  adminUser: AdminUser | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchAdminUser = async (userId: string) => {
    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", userId)
      .single()
    return data as AdminUser | null
  }

  useEffect(() => {
    let mounted = true

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted) setIsLoading(false)
    }, 10000)

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            const admin = await fetchAdminUser(session.user.id)
            if (mounted) setAdminUser(admin)
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        clearTimeout(safetyTimeout)
        if (mounted) setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const admin = await fetchAdminUser(session.user.id)
          if (mounted) setAdminUser(admin)
        } else {
          if (mounted) setAdminUser(null)
        }

        // Ensure loading is false after auth state change
        if (mounted) setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error }
    }

    // Check if user is an admin
    if (data.user) {
      const admin = await fetchAdminUser(data.user.id)
      if (!admin) {
        // User is not an admin - sign them out and deny access
        await supabase.auth.signOut()
        return { error: new Error("Access denied. You are not authorized to access the admin dashboard.") }
      }
      setAdminUser(admin)
    }

    router.push("/dashboard")
    return { error: null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (error) return { error }

    if (data.session) {
      router.push("/dashboard")
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setAdminUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, adminUser, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
