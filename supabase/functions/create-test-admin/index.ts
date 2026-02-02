/**
 * Create Test Admin Edge Function
 * 
 * Creates a test admin user for automated testing purposes.
 * This function should only be used in development/test environments.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test admin credentials
    const testEmail = "admin@test.local";
    const testPassword = "TestAdmin123!";

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === testEmail);

    let userId: string;

    if (existingAdmin) {
      userId = existingAdmin.id;
      console.log("Test admin already exists:", userId);
    } else {
      // Create the admin user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: "Test Admin",
          role: "admin",
        },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log("Created test admin user:", userId);

      // Create profile for the user
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          full_name: "Test Admin",
          email: testEmail,
        }, { onConflict: "user_id" });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
    }

    // Ensure admin role exists
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "admin",
      }, { onConflict: "user_id" });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test admin account ready",
        credentials: {
          email: testEmail,
          password: testPassword,
        },
        userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
