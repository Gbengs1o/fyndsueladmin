export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-transparent flex items-center justify-center mb-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.svg" alt="FyndFuel Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">FyndFuel Manager</h1>
                    <p className="text-gray-400">Station Management Dashboard</p>
                </div>
                {children}
            </div>
        </div>
    )
}
