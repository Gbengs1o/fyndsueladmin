import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart2, Zap, Shield, Fuel } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-2xl text-primary">
          <div className="w-10 h-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-white">FyndFuel Manager</span>
        </div>
        <Link href="/auth/login">
          <Button variant="outline" className="border-gray-700 hover:bg-gray-800 text-white">
            Log In
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center text-center py-20">
        <div className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full text-sm font-bold mb-8 border border-emerald-500/20">
          For Station Managers & Owners
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl">
          Take Control of Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">
            Fuel Station
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-12">
          Update prices in real-time, monitor market trends, and engage with thousands of daily drivers on the FyndFuel network.
        </p>

        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button className="h-14 px-8 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              Manager Dashboard
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="outline" className="h-14 px-8 text-lg font-bold border-gray-700 hover:bg-gray-800 text-white rounded-xl">
              Request Access
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left w-full max-w-5xl">
          <div className="p-8 rounded-2xl bg-[#111] border border-gray-800 hover:border-emerald-500/50 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Real-Time Updates</h3>
            <p className="text-gray-400">Instantly update prices and availability. Changes reflect on the user app within seconds.</p>
          </div>

          <div className="p-8 rounded-2xl bg-[#111] border border-gray-800 hover:border-blue-500/50 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
              <BarChart2 className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Market Intelligence</h3>
            <p className="text-gray-400">See competitor prices in your area and track user engagement trends.</p>
          </div>

          <div className="p-8 rounded-2xl bg-[#111] border border-gray-800 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Promotional Tools</h3>
            <p className="text-gray-400">Run flash sales and boost your station's visibility to attract more drivers.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-12 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} FyndFuel. All rights reserved.
      </footer>
    </div>
  )
}
