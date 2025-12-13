"use client"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { format } from "date-fns"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts"
import { Loader2, FileText, Download, Calendar, Printer, BarChart3, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function ReportsPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [reportType, setReportType] = useState("executive")
    const [timeRange, setTimeRange] = useState("30")

    const reportRef = useRef<HTMLDivElement>(null)

    const generateReport = async () => {
        setLoading(true)
        const { data: reportData, error } = await supabase.rpc('get_generated_report_data', {
            _days: parseInt(timeRange)
        })

        if (error) {
            console.error("Error generating report:", error)
        } else {
            setData(reportData)
        }
        setLoading(false)
    }

    const downloadPDF = async () => {
        if (!reportRef.current) return

        const canvas = await html2canvas(reportRef.current, {
            scale: 2 // Higher scale for better quality
        })

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        })

        const imgWidth = 210
        const pageHeight = 297
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight
            pdf.addPage()
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight
        }

        pdf.save(`FyndFuel_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="h-8 w-8 text-primary" />
                        Report Generation
                    </h1>
                    <p className="text-muted-foreground">Select criteria and generate professional PDF reports.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button onClick={downloadPDF} disabled={!data}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 w-full md:w-[200px]">
                        <label className="text-sm font-medium">Report Type</label>
                        <Select value={reportType} onValueChange={setReportType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="executive">Executive Summary</SelectItem>
                                <SelectItem value="market">Market Analysis</SelectItem>
                                <SelectItem value="audit">Audit Log</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 w-full md:w-[200px]">
                        <label className="text-sm font-medium">Time Range</label>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 Days</SelectItem>
                                <SelectItem value="30">Last 30 Days</SelectItem>
                                <SelectItem value="90">Last 3 Months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        className="w-full md:w-auto"
                        onClick={generateReport}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Generate Report"
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Report Preview Area */}
            {data ? (
                <div className="border rounded-lg shadow-sm bg-white p-8 md:p-12 min-h-[800px]" ref={reportRef}>
                    {/* Report Header */}
                    <div className="flex justify-between items-start border-b pb-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                {reportType === 'executive' ? 'Executive Summary Report' :
                                    reportType === 'market' ? 'Fuel Market Analysis Report' : 'System Audit Report'}
                            </h2>
                            <p className="text-slate-500 mt-1">Generated by {user?.email} on {format(new Date(), 'PPP')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">Fynd Fuel Admin</p>
                            <p className="text-sm text-slate-500">Period: {format(new Date(data.period.start_date), 'MMM dd')} - {format(new Date(data.period.end_date), 'MMM dd, yyyy')}</p>
                        </div>
                    </div>

                    {/* Content based on Report Type */}
                    <div className="space-y-8">

                        {/* Metrics Grid (Always visible for Exec/Market) */}
                        {reportType !== 'audit' && (
                            <div className="grid grid-cols-3 gap-8 mb-8">
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">Total Reports</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{data.metrics.total_reports}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">Avg Petrol Price</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">₦{data.metrics.avg_pms_price || '---'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">New Users</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{data.metrics.new_users}</p>
                                </div>
                            </div>
                        )}

                        {/* Charts Section */}
                        {reportType !== 'audit' && (
                            <div className="mb-8 break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Price Trend Analysis
                                </h3>
                                <div className="h-[300px] w-full border rounded-lg p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.price_trend}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" tickFormatter={d => format(new Date(d), 'MMM dd')} stroke="#64748b" fontSize={12} />
                                            <YAxis stroke="#64748b" fontSize={12} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="avg_price" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Regional Table */}
                        {(reportType === 'executive' || reportType === 'market') && (
                            <div className="mb-8 break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Regional Breakdown</h3>
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-900">Region</TableHead>
                                            <TableHead className="font-bold text-slate-900 text-right">Activity Volume</TableHead>
                                            <TableHead className="font-bold text-slate-900 text-right">Avg Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.regional_data?.map((row: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{row.region}</TableCell>
                                                <TableCell className="text-right">{row.report_count}</TableCell>
                                                <TableCell className="text-right">₦{row.avg_price}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Audit Logs (For Audit or Exec) */}
                        {(reportType === 'audit' || reportType === 'executive') && (
                            <div className="break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5" />
                                    Recent Admin Actions
                                </h3>
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-900">Time</TableHead>
                                            <TableHead className="font-bold text-slate-900">Admin</TableHead>
                                            <TableHead className="font-bold text-slate-900">Action</TableHead>
                                            <TableHead className="font-bold text-slate-900">Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.audit_logs?.map((log: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                    {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                                                </TableCell>
                                                <TableCell className="font-medium text-sm">{log.admin_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] font-normal">
                                                        {log.action_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                                                    {JSON.stringify(log.details)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!data.audit_logs || data.audit_logs.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-slate-500 py-8">No audit logs found for this period.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t text-center text-slate-400 text-sm">
                        <p>Confidential Report • Generated via Fynd Fuel Admin Dashboard</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-muted/10 border-dashed">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Report Generated</h3>
                    <p className="text-muted-foreground text-center max-w-[400px] mt-2">
                        Select a report type and time range above, then click "Generate Report" to view user activity, price trends, and more.
                    </p>
                </div>
            )}
        </div>
    )
}
