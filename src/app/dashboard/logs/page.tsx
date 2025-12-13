"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { format } from "date-fns"

import { Loader2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface AuditLog {
  id: string
  action_type: string
  target_table: string
  target_id: string
  details: any
  created_at: string
  admin_email: string
  admin_name: string | null
  admin_avatar: string | null
}

export default function AuditLogsPage() {
  const { isLoading: authLoading } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (authLoading) return;
    const fetchLogs = async () => {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select(`
          *,
          admin_users (
            email,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        const formattedData = data.map((log: any) => ({
          id: log.id,
          action_type: log.action_type,
          target_table: log.target_table,
          target_id: log.target_id,
          details: log.details,
          created_at: log.created_at,
          admin_email: log.admin_users?.email || 'Unknown',
          admin_name: log.admin_users?.full_name || 'Unknown',
          admin_avatar: log.admin_users?.avatar_url
        }))
        setLogs(formattedData)
      }
      setIsLoading(false)
    }

    fetchLogs()

  }, [authLoading])

  const handleUndo = async (log: AuditLog) => {
    if (!confirm("Are you sure you want to undo this action? This will attempt to revert the database functionality.")) return;

    setProcessingId(log.id)
    try {
      let error = null;

      switch (log.action_type) {
        case 'DELETE_STATION':
        case 'UPDATE_STATION':
          if (log.details?.previous_state) {
            // Sanitize state (remove joins like price_reports if they exist)
            const { price_reports, ...cleanState } = log.details.previous_state;

            if (log.action_type === 'DELETE_STATION') {
              // Re-insert the deleted record
              const { error: insertError } = await supabase.from(log.target_table).insert(cleanState);
              error = insertError;
            } else {
              // Revert update
              const { error: updateError } = await supabase.from(log.target_table).update(cleanState).eq('id', log.target_id);
              error = updateError;
            }
          } else {
            throw new Error("No previous state found to revert to.");
          }
          break;

        case 'CREATE_STATION':
          // Undo create = Delete
          const { error: deleteError } = await supabase.from(log.target_table).delete().eq('id', log.target_id);
          error = deleteError;
          break;

        case 'APPROVE_SUGGESTION':
          // Undo approve = Delete created station AND set suggestion back to pending
          if (log.details?.created_station_id) {
            await supabase.from('stations').delete().eq('id', log.details.created_station_id);
          }
          const { error: revSuggestionError } = await supabase
            .from('suggested_fuel_stations')
            .update({ status: 'pending' })
            .eq('id', log.target_id);
          error = revSuggestionError;
          break;

        case 'REJECT_SUGGESTION':
          // Undo reject = Set back to pending
          const { error: undoRejectError } = await supabase
            .from('suggested_fuel_stations')
            .update({ status: 'pending' })
            .eq('id', log.target_id);
          error = undoRejectError;
          break;

        case 'DELETE_SUGGESTION':
          if (log.details?.previous_state) {
            // Re-insert the deleted suggestion
            const { error: insertError } = await supabase.from('suggested_fuel_stations').insert(log.details.previous_state);
            error = insertError;
          } else {
            throw new Error("No previous state found to restore suggestion.");
          }
          break;

        case 'DISMISS_FLAG':
          if (log.details?.previous_state) {
            const { error: insertFlagError } = await supabase.from('flagged_stations').insert(log.details.previous_state);
            error = insertFlagError;
          } else {
            throw new Error("No previous state found to restore flag.");
          }
          break;

        case 'CLEAR_ALL_FLAGS':
          if (log.details?.previous_state && Array.isArray(log.details.previous_state)) {
            const { error: insertFlagsError } = await supabase.from('flagged_stations').insert(log.details.previous_state);
            error = insertFlagsError;
          } else {
            throw new Error("No previous flags found to restore.");
          }
          break;

        case 'BAN_USER':
        case 'UNBAN_USER':
        case 'PROMOTE_USER':
        case 'DEMOTE_USER':
          if (log.details?.previous_state) {
            const { error: revUserError } = await supabase.from('profiles').update(log.details.previous_state).eq('id', log.target_id);
            error = revUserError;
          } else {
            throw new Error("No previous state found to revert user change.");
          }
          break;

        case 'DELETE_USER':
          if (log.details?.previous_state) {
            const { error: insertUserError } = await supabase.from('profiles').insert(log.details.previous_state);
            error = insertUserError;
          } else {
            throw new Error("No previous state found to restore deleted user.");
          }
          break;

        case 'REJECT_PRICE':
          if (log.details?.previous_state) {
            // Re-insert deleted price report
            const { error: insertPriceError } = await supabase.from('price_reports').insert(log.details.previous_state);
            error = insertPriceError;
          } else {
            throw new Error("No previous state found to restore price report.");
          }
          break;

        case 'APPROVE_PRICE':
          // Undo approve = Set back to Pending
          const { error: undoApprovePriceError } = await supabase
            .from('price_reports')
            .update({ status: 'Pending' })
            .eq('id', log.target_id);
          error = undoApprovePriceError;
          break;

        default:
          throw new Error(`Undo not implemented for action: ${log.action_type}`);
      }

      if (error) {
        throw error;
      }

      toast({ title: "Undone", description: "Action has been successfully reverted." })

      // Log the Undo action itself (optional, but good for audit trail)
      // For now, simpler to just refresh logs or show success

    } catch (err: any) {
      console.error("Undo failed:", err);
      toast({ variant: "destructive", title: "Undo Failed", description: err.message || "Could not revert action." });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">Track all administrative actions and changes.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action History</CardTitle>
          <CardDescription>Recent actions performed by administrators.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={log.admin_avatar || ''} />
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{log.admin_name}</span>
                          <span className="text-xs text-muted-foreground">{log.admin_email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                        {log.target_table}
                      </span>
                    </TableCell>
                    <TableCell>
                      <pre className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {JSON.stringify(log.details)}
                      </pre>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndo(log)}
                        disabled={!!processingId}
                      >
                        {processingId === log.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="flex items-center text-xs text-blue-600 hover:text-blue-800">
                            <Undo2 className="mr-1 h-3 w-3" /> Undo
                          </span>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No actions recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
