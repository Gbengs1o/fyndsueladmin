"use client"

import {
  BadgeCheck,
  BarChart3,
  Bell,
  CheckCheck,
  FileText,
  Flag,
  Fuel,
  Gamepad2,
  History,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  Mail,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { Logo } from "@/components/logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/prices", icon: BadgeCheck, label: "Official Prices" },
  { href: "/dashboard/stations", icon: Fuel, label: "Station Management" },
  { href: "/dashboard/suggested-stations", icon: Lightbulb, label: "Suggested Stations" },
  { href: "/dashboard/moderation", icon: CheckCheck, label: "Price Moderation" },
  { href: "/dashboard/flags", icon: Flag, label: "Flagged Content" },
  { href: "/dashboard/users", icon: Users, label: "User Moderation" },
  { href: "/dashboard/gamification", icon: Gamepad2, label: "Gamification" },
  { href: "/dashboard/redemptions", icon: Wallet, label: "Redemptions" },
  { href: "/dashboard/managers", icon: ShieldCheck, label: "Manager Management" },
  { href: "/dashboard/broadcast", icon: Mail, label: "Broadcast" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/reports", icon: FileText, label: "Report Generation" },
  { href: "/dashboard/notifications", icon: Send, label: "Notifications" },
  { href: "/dashboard/adverts", icon: LayoutDashboard, label: "Adverts" },
  { href: "/dashboard/logs", icon: History, label: "System Logs" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, adminUser, isLoading, signOut } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || "AD"
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-auto text-primary" />
            <h1 className="text-xl font-semibold font-headline text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              FYND FUEL
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label, side: "right", align: "center" }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="p-2 cursor-pointer rounded-md hover:bg-sidebar-accent flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={adminUser?.avatar_url || ""} alt="@admin" />
                  <AvatarFallback>{getInitials(adminUser?.full_name, user?.email)}</AvatarFallback>
                </Avatar>
                <div className="group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium text-sidebar-foreground">{adminUser?.full_name || "Admin"}</p>
                  <p className="text-xs text-sidebar-foreground/70">{user?.email}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger />
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="icon" className="w-8 h-8">
              <Bell className="w-4 h-4" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
