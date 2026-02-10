'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart2, Zap, Shield, Fuel, ChevronDown, CheckCircle2, Star, Quote, Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from "next-themes"

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white transition-colors duration-300">
      {/* Dynamic Navbar */}
      {/* Dynamic Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-background/80 backdrop-blur-md py-3 border-border shadow-lg' : 'bg-transparent py-5 border-transparent'
        }`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-2xl group cursor-pointer">
            <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
              {/* Logo from user */}
              <img src="/logo.svg" alt="FyndFuel Logo" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 group-hover:to-primary transition-all">FyndFuel Manager</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors relative group">
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </a>
            <a href="#about" className="hover:text-primary transition-colors relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </a>
            <a href="#testimonials" className="hover:text-primary transition-colors relative group">
              Testimonials
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Switcher */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full text-foreground hover:bg-accent/20 transition-transform hover:rotate-12">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Link href="/auth/login">
              <Button variant="outline" className="h-10 px-6 rounded-full border-primary/20 hover:border-primary hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all">
                Manager Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section V2: Human, Vibrant, Interactive */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden min-h-[90vh] flex items-center">
        {/* Vibrant Animated Background */}
        <div className="absolute inset-0 -z-10 bg-background overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[60rem] h-[60rem] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[4s]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-[6s] delay-1000" />
          <div className="absolute top-[40%] left-[20%] w-[30rem] h-[30rem] bg-pink-500/10 rounded-full blur-[80px] mix-blend-screen animate-bounce duration-[10s]" />
        </div>

        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left z-10">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-6 tracking-wide uppercase hover:bg-primary/20 transition-colors cursor-default">
                <Star className="w-4 h-4 fill-current animate-spin-slow" />
                <span>The Human Side of Management</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1] animate-in fade-in zoom-in-95 duration-1000 text-foreground">
              Run Your Station <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500 animate-gradient-x">Like a Human.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Technology that doesn't feel like a robot. Empower your team with intuitive tools, real-time insights, and a dashboard that actually speaks your language.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <Link href="/auth/login">
                <Button className="h-16 px-10 text-lg font-bold bg-gradient-to-r from-primary to-purple-700 hover:from-primary/90 hover:to-purple-700/90 text-white rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 group">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <Button variant="ghost" className="h-16 px-8 text-lg font-medium text-foreground hover:bg-accent/50 rounded-2xl">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Interactive Human Image Composition */}
          <div className="relative h-[600px] w-full hidden lg:block animate-in fade-in slide-in-from-right-12 duration-1000 delay-300 translate-x-12">
            {/* Main Human Image */}
            <div className="absolute top-10 right-10 w-[80%] h-[90%] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-card/50 rotate-3 hover:rotate-0 transition-transform duration-700 ease-out group">
              <img
                src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1000"
                alt="Happy Station Manager"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

              {/* Floating Info inside image */}
              <div className="absolute bottom-8 left-8 text-white">
                <p className="font-bold text-lg">Sarah Jenkins</p>
                <p className="text-sm opacity-90">Station Manager, Lagos</p>
              </div>
            </div>

            {/* Floating Elements (Parallax-ish) */}

            {/* Card 1: Live Revenue */}
            <div className="absolute top-40 left-0 bg-card/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-border/50 animate-bounce-slow hover:scale-110 transition-transform cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Live Revenue</p>
                  <p className="text-xl font-black text-foreground">₦ 845,000</p>
                </div>
              </div>
            </div>

            {/* Card 2: Fuel Status */}
            <div className="absolute bottom-20 right-0 bg-card/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-border/50 animate-bounce-slower hover:scale-110 transition-transform cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">PMS Tank 1</p>
                  <div className="w-24 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-primary w-[75%] animate-pulse" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">75% Full</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-card/30 relative">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">Unrivaled Performance Tools</h2>
            <p className="text-muted-foreground">Everything you need to scale your station management efficiently and reliably.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="Real-Time Sync"
              description="Update prices and fuel availability across the network in milliseconds."
              color="text-yellow-500"
            />
            <FeatureCard
              icon={BarChart2}
              title="Actionable Analytics"
              description="Gain insights into sales volume, peak hours, and local market trends."
              color="text-primary"
            />
            <FeatureCard
              icon={Shield}
              title="Fraud Prevention"
              description="Secure transaction tracking and role-based access for your station staff."
              color="text-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 border-y border-border bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 text-primary font-bold tracking-widest text-xs uppercase">
                <Quote className="w-4 h-4 fill-current" />
                Success Stories
              </div>
              <h2 className="text-4xl font-bold leading-tight text-foreground">Trusted by over 500+ <br /> Station Owners in Nigeria.</h2>
              <div className="space-y-4">
                {["Automated pricing saves us 10 hours weekly", "User engagement increased by 40%", "Real-time visibility is a game changer"].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-6">
              <Card className="p-8 bg-card border-border rounded-3xl">
                <p className="text-lg text-muted-foreground italic mb-6">
                  "FyndFuel transformed how we manage our depots. The interface is intuitive, and the real-time reporting has reduced our operational friction significantly."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div>
                    <p className="font-bold text-foreground">Emeka Okoro</p>
                    <p className="text-xs text-muted-foreground">Managing Director, Eco-Fuel LTD</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 text-foreground">Ready to modernize your station?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10">Join the thousands of station managers who have already upgraded to the FyndFuel Manager suite.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button className="h-16 px-10 text-lg font-bold bg-foreground text-background hover:bg-muted-foreground/90 rounded-2xl">Create Free Account</Button>
            </Link>
            <Button variant="outline" className="h-16 px-10 text-lg font-bold border-border text-foreground rounded-2xl">Contact Support</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-3 font-bold text-xl mb-6">
                <Fuel className="text-primary" />
                <span className="text-foreground">FyndFuel</span>
              </div>
              <p className="text-muted-foreground max-w-sm">Building the largest network of verified and efficient fuel stations across Africa.</p>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/api" className="hover:text-primary">API Reference</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
                <li><Link href="/careers" className="hover:text-primary">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between border-t border-border pt-8 gap-4">
            <p className="text-muted-foreground text-sm">&copy; {new Date().getFullYear()} FyndFuel Technologies. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary">Privacy</Link>
              <Link href="/terms" className="hover:text-primary">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, color }: any) {
  return (
    <div className="group p-8 rounded-[2.5rem] bg-card/80 border border-border hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-lg hover:shadow-primary/10">
      <div className={`w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${color} border border-border`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
    </div>
  )
}

function Card({ children, className }: any) {
  return (
    <div className={`shadow-xl ${className}`}>
      {children}
    </div>
  )
}
