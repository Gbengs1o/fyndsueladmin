
import { supabase } from "@/lib/supabase"

export type AdminActionType =
    | 'CREATE_STATION' | 'UPDATE_STATION' | 'DELETE_STATION'
    | 'APPROVE_SUGGESTION' | 'REJECT_SUGGESTION' | 'DELETE_SUGGESTION'
    | 'APPROVE_PRICE' | 'REJECT_PRICE'
    | 'DISMISS_FLAG' | 'CLEAR_ALL_FLAGS'
    | 'BAN_USER' | 'UNBAN_USER' | 'PROMOTE_USER' | 'DEMOTE_USER' | 'DELETE_USER';

export async function logAdminAction(
    action_type: AdminActionType,
    target_table: string,
    target_id: string,
    details: { previous_state?: any;[key: string]: any } = {}
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // rigorous check, though page should be guarded

        const { error } = await supabase
            .from('admin_audit_logs')
            .insert({
                admin_id: user.id,
                action_type,
                target_table,
                target_id,
                details
            });

        if (error) {
            console.error("Failed to log admin action:", error);
        }
    } catch (e) {
        console.error("Exception logging admin action:", e);
    }
}
