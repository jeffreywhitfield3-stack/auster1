// API Route: Delete user account
// DELETE /api/account/delete

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Delete the user from Supabase Auth
    // This will cascade delete all related data via foreign key constraints
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      // If admin API not available, try RPC function as fallback
      const { error: rpcError } = await supabase.rpc("delete_user_account", {
        user_id: user.id,
      });

      if (rpcError) {
        console.error("Error deleting user:", rpcError);
        return NextResponse.json(
          {
            error: "Failed to delete account. Please contact support.",
            details: rpcError.message
          },
          { status: 500 }
        );
      }
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in account deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
