"use client"

import { ArrowRight, Zap } from "lucide-react"
import Link from "next/link"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a1a2e] text-white selection:bg-[#764ba2]/30">

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#1a1a2e]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto text-[#EDAE10] drop-shadow-[0_0_15px_rgba(237,174,16,0.5)]" />
            <span className="text-xl font-bold tracking-tight text-white font-headline">FyndFuel <span className="text-[#8e6bbf]">Manager</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/5">
                Login
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#764ba2] hover:bg-[#643a91] text-white font-semibold shadow-[0_4px_20px_-5px_rgba(118,75,162,0.5)] border border-[#764ba2]/50">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-32 pb-20 relative overflow-hidden">

        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#764ba2] rounded-full blur-[180px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#EDAE10] rounded-full blur-[180px] opacity-10 pointer-events-none"></div>

        {/* Badge */}
        <div className="mb-8 animate-fade-in-up flex items-center gap-2 rounded-full border border-[#764ba2]/30 bg-[#764ba2]/10 px-4 py-1.5 shadow-[0_0_30px_-5px_hsl(270,37%,46%,0.2)] backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EDAE10] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EDAE10]"></span>
          </span>
          <span className="text-sm font-medium text-[#c0a3e5] tracking-wide">For Station Managers & Owners</span>
        </div>

        {/* Hero Text */}
        <div className="text-center max-w-5xl mx-auto space-y-6 animate-fade-in-up animation-delay-100">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1]">
            Take Control of Your <br />
            <span className="bg-gradient-to-r from-[#EDAE10] via-[#F2C94C] to-[#EDAE10] bg-clip-text text-transparent drop-shadow-sm">
              Fuel Station
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-400 sm:text-x leading-relaxed">
            Update prices in <span className="text-white font-semibold">real-time</span>, monitor market trends, and engage with thousands of drivers on the most advanced fuel network.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 animate-fade-in-up animation-delay-200">
          <Link href="/login">
            <Button size="lg" className="h-16 px-8 rounded-full bg-[#764ba2] hover:bg-[#683f94] text-white text-lg font-bold shadow-[0_10px_40px_-10px_rgba(118,75,162,0.6)] transition-all transform hover:scale-105 hover:shadow-[0_20px_40px_-10px_rgba(118,75,162,0.8)] border border-white/10 group">
              Manager Dashboard
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          <Link href="https://fyndfuel.com" target="_blank">
            <Button variant="outline" size="lg" className="h-16 px-8 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 text-lg backdrop-blur-sm transition-all hover:scale-105">
              <Zap className="mr-2 h-5 w-5 text-[#EDAE10]" />
              How it Works
            </Button>
          </Link>
        </div>

        {/* Abstract Dashboard Preview (CSS Only for now) */}
        <div className="mt-20 w-full max-w-6xl animate-fade-in-up animation-delay-300 perspective-[2000px]">
          <div className="relative rounded-2xl border border-white/10 bg-[#1e1e32]/80 p-2 shadow-2xl backdrop-blur-sm transform rotate-x-[20deg] hover:rotate-x-0 transition-all duration-1000 ease-out group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none"></div>

            {/* Fake UI Header */}
            <div className="h-full w-full rounded-xl bg-[#131320] overflow-hidden border border-white/5 aspect-[16/9] flex flex-col">
              <div className="h-14 border-b border-white/5 flex items-center px-6 gap-4 bg-[#1a1a2e]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="h-2 w-32 bg-white/10 rounded-full ml-4"></div>
              </div>
              {/* Body */}
              <div className="flex-1 p-8 grid grid-cols-12 gap-6 bg-[#131320]">
                <div className="col-span-3 space-y-4">
                  <div className="h-32 rounded-xl bg-[#1e1e32] border border-white/5 animate-pulse"></div>
                  <div className="h-32 rounded-xl bg-[#1e1e32] border border-white/5 animate-pulse delay-75"></div>
                  <div className="h-full rounded-xl bg-[#1e1e32] border border-white/5 animate-pulse delay-150"></div>
                </div>
                <div className="col-span-9 space-y-6">
                  <div className="flex gap-4">
                    <div className="h-32 flex-1 rounded-xl bg-gradient-to-br from-[#764ba2]/20 to-[#1e1e32] border border-[#764ba2]/30 p-6">
                      <div className="h-8 w-8 rounded-lg bg-[#764ba2] mb-4"></div>
                      <div className="h-4 w-24 bg-white/20 rounded mb-2"></div>
                      <div className="h-8 w-32 bg-white/40 rounded"></div>
                    </div>
                    <div className="h-32 flex-1 rounded-xl bg-[#1e1e32] border border-white/5"></div>
                    <div className="h-32 flex-1 rounded-xl bg-[#1e1e32] border border-white/5"></div>
                  </div>
                  <div className="h-64 rounded-xl bg-[#1e1e32] border border-white/5 w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      <footer className="py-8 text-center text-sm text-gray-500 border-t border-white/5 bg-[#1a1a2e]">
        © {new Date().getFullYear()} Fynd Fuel. All rights reserved.
      </footer>
    </div>
  )
}
