import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

// Safely derive current directory in both ESM and CJS environments
const resolvedDistPath = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

// Initialize express app
const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json());

// Helper function to get a Supabase client dynamically based on parameters or env variables
function getSupabaseClient(url: string, key: string) {
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// 1. Test Auth Connection
app.post("/api/supabase/test-connection", async (req, res) => {
  const { url, key } = req.body;
  const targetUrl = url || process.env.SUPABASE_URL;
  const targetKey = key || process.env.SUPABASE_ANON_KEY;

  if (!targetUrl || !targetKey) {
    return res.status(400).json({ success: false, message: "Supabase URL and Key must be provided." });
  }

  try {
    const client = getSupabaseClient(targetUrl, targetKey);
    if (!client) {
      return res.status(500).json({ success: false, message: "Failed to initialize Supabase client." });
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      return res.json({ success: false, message: `Auth service rejected connection: ${error.message}` });
    }

    return res.json({ success: true, message: "Successfully connected to Supabase Auth API!" });
  } catch (e: any) {
    return res.json({ success: false, message: e?.message || "Unknown network error when fetching from Supabase" });
  }
});

// 2. Test Database Access
app.post("/api/supabase/test-database", async (req, res) => {
  const { url, key } = req.body;
  const targetUrl = url || process.env.SUPABASE_URL;
  const targetKey = key || process.env.SUPABASE_ANON_KEY;

  if (!targetUrl || !targetKey) {
    return res.status(400).json({ success: false, message: "Supabase URL and Key must be provided." });
  }

  try {
    const client = getSupabaseClient(targetUrl, targetKey);
    if (!client) {
      return res.status(500).json({ success: false, message: "Failed to initialize Supabase client." });
    }

    // Try a REST query to inspect public tables
    const { data, error } = await client
      .from("_dummy_or_profiles")
      .select("*")
      .limit(1);

    if (error) {
      if (error.code === "42P01") {
        return res.json({
          success: true,
          tables: [],
          message: "Connected! Database API is responsive, but no custom profiles table exists yet. Use the SQL templates to create tables.",
        });
      }
      return res.json({
        success: false,
        tables: [],
        message: `Database query failed: [${error.code}] ${error.message}`,
      });
    }

    return res.json({
      success: true,
      tables: ["profiles"],
      message: "Successfully queried the database profiles table!",
    });
  } catch (e: any) {
    return res.json({
      success: false,
      tables: [],
      message: e?.message || "Database connection error",
    });
  }
});

// 3. Fetch Registered Users (requires service role key)
app.post("/api/supabase/fetch-users", async (req, res) => {
  const { url, serviceRoleKey } = req.body;
  const targetUrl = url || process.env.SUPABASE_URL;
  const targetKey = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!targetUrl || !targetKey) {
    return res.status(400).json({ success: false, error: "Supabase URL and Service Role Key must be provided." });
  }

  try {
    const client = getSupabaseClient(targetUrl, targetKey);
    if (!client) {
      return res.status(500).json({ success: false, error: "Failed to initialize administrative Supabase client." });
    }

    const { data, error } = await client.auth.admin.listUsers();
    if (error) {
      throw error;
    }

    return res.json({ success: true, users: data.users });
  } catch (e: any) {
    return res.json({
      success: false,
      error: e?.message || "Permission denied. Listing users requires a valid service_role secret key.",
    });
  }
});

// 4. Create Admin User
app.post("/api/supabase/create-admin-user", async (req, res) => {
  const { url, serviceRoleKey, anonKey, email, password, username, useServiceKey } = req.body;
  const targetUrl = url || process.env.SUPABASE_URL;
  const targetServiceKey = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const targetAnonKey = anonKey || process.env.SUPABASE_ANON_KEY;

  if (!targetUrl) {
    return res.status(400).json({ success: false, error: "Supabase URL is required." });
  }

  // A. Admin Signup using Service Role key
  if (useServiceKey) {
    if (!targetServiceKey) {
      return res.status(400).json({ success: false, error: "Service Role Key is required for administrative provisioning." });
    }

    try {
      const client = getSupabaseClient(targetUrl, targetServiceKey);
      if (!client) {
        throw new Error("Failed to initialize admin client.");
      }

      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          role: "admin",
          full_name: "Administrator",
        },
        app_metadata: {
          role: "admin",
        },
      });

      if (error) {
        throw error;
      }

      return res.json({ success: true, user: data.user, method: "service_role" });
    } catch (e: any) {
      return res.json({ success: false, error: e?.message || "Administrative creation failed." });
    }
  } else {
    // B. Standard client signup
    if (!targetAnonKey) {
      return res.status(400).json({ success: false, error: "Anon Key is required for public signup." });
    }

    try {
      const client = getSupabaseClient(targetUrl, targetAnonKey);
      if (!client) {
        throw new Error("Failed to initialize public client.");
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role: "admin",
            full_name: "Administrator",
          },
        },
      });

      if (error) {
        throw error;
      }

      const isConfirmed = data.user?.email_confirmed_at != null;

      return res.json({
        success: true,
        user: data.user,
        method: "signUp",
        needsVerification: !isConfirmed,
      });
    } catch (e: any) {
      return res.json({ success: false, error: e?.message || "Public signup failed." });
    }
  }
});

// 4.5. Login User
app.post("/api/supabase/login", async (req, res) => {
  const { url, anonKey, email, password } = req.body;
  const targetUrl = url || process.env.SUPABASE_URL;
  const targetKey = anonKey || process.env.SUPABASE_ANON_KEY;

  if (!targetUrl || !targetKey || !email || !password) {
    return res.status(400).json({ success: false, error: "Supabase URL, Anon Key, Email, and Password are required." });
  }

  try {
    const client = getSupabaseClient(targetUrl, targetKey);
    if (!client) {
      throw new Error("Failed to initialize public client.");
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (e: any) {
    return res.json({ success: false, error: e?.message || "Login failed." });
  }
});

// 5. Delete User
app.post("/api/supabase/delete-user", async (req, res) => {
  const { url, serviceRoleKey, userId } = req.body;
  const targetUrl = url || process.env.SUPABASE_URL;
  const targetKey = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!targetUrl || !targetKey || !userId) {
    return res.status(400).json({ success: false, error: "Supabase URL, Service Role Key, and User ID are required." });
  }

  try {
    const client = getSupabaseClient(targetUrl, targetKey);
    if (!client) {
      return res.status(500).json({ success: false, error: "Failed to initialize administrative Supabase client." });
    }

    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) {
      throw error;
    }

    return res.json({ success: true });
  } catch (e: any) {
    return res.json({ success: false, error: e?.message || "User deletion failed." });
  }
});

// Serve static assets and Vite development setup
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (!process.argv[1]?.endsWith(".ts") && !process.argv[1]?.includes("server.ts"));

  console.log(`[Server Startup] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[Server Startup] argv: ${JSON.stringify(process.argv)}`);
  console.log(`[Server Startup] resolvedDistPath: ${resolvedDistPath}`);
  console.log(`[Server Startup] Detected Mode: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}`);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Development] Mounted Vite dev middleware.");
  } else {
    // When compiled with esbuild to dist/server.cjs, resolvedDistPath is the dist/ directory.
    const distPath = path.resolve(resolvedDistPath);
    console.log(`[Production] Serving static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
