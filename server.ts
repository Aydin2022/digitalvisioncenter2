import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";

// In-memory store for password reset verification codes
const passwordResetCodes = new Map<string, { code: string; expiresAt: number }>();

// In-memory sent email logs (for webmail inbox inspection in sandbox environment)
interface SentEmail {
  id: string;
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  code: string;
  sentAt: string;
  deliveredVia: string;
}
const sentEmailLogs: SentEmail[] = [];

// Helper to create mail transporter
function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    if (user.endsWith('@gmail.com') || host.includes('gmail')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
}

// Load environment variables from .env and .env.example
if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
}
if (fs.existsSync(".env.example")) {
  try {
    const exampleEnv = dotenv.parse(fs.readFileSync(".env.example"));
    for (const k in exampleEnv) {
      let val = exampleEnv[k] ? exampleEnv[k].trim() : "";
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (!process.env[k] || process.env[k]!.trim() === "") {
        process.env[k] = val.trim();
      }
    }
  } catch (e) {
    console.error("Error parsing .env.example:", e);
  }
}

// Safely derive current directory in both ESM and CJS environments
const resolvedDistPath = typeof __dirname !== "undefined"
  ? __dirname
  : (typeof import.meta !== "undefined" && import.meta?.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

// Initialize express app
const app = express();
const PORT = 3000;

// Helper to sanitize credential strings (remove spaces and surrounding quotes)
function sanitizeCredential(val: string | undefined): string {
  if (!val) return "";
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1);
  }
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

// Helper to check if a value is a placeholder or invalid credential
function isPlaceholder(val: string | undefined): boolean {
  if (!val) return true;
  const s = val.trim().toLowerCase();
  return (
    s === "" ||
    s.includes("your_") ||
    s.includes("my_") ||
    s.includes("_here") ||
    s.includes("placeholder") ||
    s === "9647700000000"
  );
}

// Helper to load ZainCash Configuration dynamically
function getZainCashConfig() {
  let fileData: any = null;
  try {
    const tmpPath = "/tmp/zaincash-config.json";
    const localPath = path.join(process.cwd(), "zaincash-config.json");
    if (fs.existsSync(tmpPath)) {
      fileData = JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    } else if (fs.existsSync(localPath)) {
      fileData = JSON.parse(fs.readFileSync(localPath, "utf8"));
    } else if (fs.existsSync("./zaincash-config.json")) {
      fileData = JSON.parse(fs.readFileSync("./zaincash-config.json", "utf8"));
    }
  } catch (err) {
    console.error("Error reading zaincash-config.json:", err);
  }

  const envID = sanitizeCredential(process.env.ZAINCASH_CLIENT_ID);
  const envSecret = sanitizeCredential(process.env.ZAINCASH_CLIENT_SECRET);
  const envMSISDN = sanitizeCredential(process.env.ZAINCASH_MSISDN);
  const envAPIUrl = sanitizeCredential(process.env.ZAINCASH_API_URL);

  const fileID = fileData?.clientId ? sanitizeCredential(fileData.clientId) : "";
  const fileSecret = fileData?.clientSecret ? sanitizeCredential(fileData.clientSecret) : "";
  const fileMSISDN = fileData?.msisdn ? sanitizeCredential(fileData.msisdn) : "";
  const fileAPIUrl = fileData?.apiUrl ? sanitizeCredential(fileData.apiUrl) : "";

  const finalClientId = !isPlaceholder(envID) ? envID : (!isPlaceholder(fileID) ? fileID : "");
  const finalClientSecret = !isPlaceholder(envSecret) ? envSecret : (!isPlaceholder(fileSecret) ? fileSecret : "");
  const finalMsisdn = !isPlaceholder(envMSISDN) ? envMSISDN : (!isPlaceholder(fileMSISDN) ? fileMSISDN : "9647708506036");

  // Determine if credentials belong to test/sandbox merchant
  const isTestMerchant = !finalClientId || finalClientId === "5c649264111a345c7e8b4567" || finalClientId.startsWith("5c649264");
  const rawMode = fileData?.mode || (isTestMerchant ? "sandbox" : "production");
  const mode = isTestMerchant ? "sandbox" : (rawMode === "production" ? "production" : "sandbox");

  let rawUrl = !isPlaceholder(envAPIUrl) ? envAPIUrl : (!isPlaceholder(fileAPIUrl) ? fileAPIUrl : "");
  if (rawUrl.includes("pg-api-uat.zaincash.iq")) {
    rawUrl = "";
  }

  const finalApiUrl = rawUrl || (mode === "sandbox" ? "https://test.zaincash.iq" : "https://pg-api.zaincash.iq");

  return {
    clientId: finalClientId,
    clientSecret: finalClientSecret,
    msisdn: finalMsisdn,
    apiUrl: finalApiUrl,
    mode
  };
}

// Safe body parsing middleware for standalone & serverless environments
app.use((req: any, res: any, next: any) => {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    return next();
  }
  express.json()(req, res, next);
});

// Normalize URL path for serverless / Vercel rewrites if needed
app.use((req, res, next) => {
  if (process.env.VERCEL) {
    const fwdUri = (req.headers["x-forwarded-uri"] as string) || "";
    const realUrl = (req.headers["x-real-url"] as string) || "";
    const queryPath = (req.query?.__path as string) || "";
    const matchedPath = (req.headers["x-matched-path"] as string) || (req.headers["x-invoke-path"] as string) || "";
    const origUrl = req.originalUrl || "";
    const currentUrl = req.url || "";

    let effectiveUrl = "";
    if (fwdUri && !fwdUri.includes("index.ts") && !fwdUri.includes("index.js")) {
      effectiveUrl = fwdUri;
    } else if (realUrl && !realUrl.includes("index.ts") && !realUrl.includes("index.js")) {
      effectiveUrl = realUrl;
    } else if (queryPath) {
      effectiveUrl = queryPath.startsWith("/api") ? queryPath : "/api" + (queryPath.startsWith("/") ? queryPath : "/" + queryPath);
    } else if (origUrl && !origUrl.includes("index.ts") && !origUrl.includes("index.js")) {
      effectiveUrl = origUrl;
    } else if (matchedPath && !matchedPath.includes("index.ts") && !matchedPath.includes("index.js")) {
      effectiveUrl = matchedPath;
    } else if (currentUrl && !currentUrl.includes("index.ts") && !currentUrl.includes("index.js")) {
      effectiveUrl = currentUrl;
    } else {
      effectiveUrl = currentUrl || origUrl || matchedPath;
    }

    effectiveUrl = effectiveUrl.split("?")[0]; // remove query string from URL path matching
    effectiveUrl = effectiveUrl.replace(/^\/api\/api\//, "/api/");
    if (effectiveUrl.startsWith("/api/index.ts")) {
      effectiveUrl = effectiveUrl.replace("/api/index.ts", "");
    } else if (effectiveUrl.startsWith("/api/index")) {
      effectiveUrl = effectiveUrl.replace("/api/index", "");
    }

    if (!effectiveUrl || effectiveUrl === "") {
      effectiveUrl = "/";
    }

    if (!effectiveUrl.startsWith("/api") && effectiveUrl !== "/") {
      effectiveUrl = "/api" + (effectiveUrl.startsWith("/") ? effectiveUrl : "/" + effectiveUrl);
    }

    req.url = effectiveUrl;
    console.log(`[Vercel Serverless] Method: ${req.method}, Effective URL: ${req.url}`);
  }
  next();
});

// --- PASSWORD RESET & EMAIL DISPATCH SERVICES ---

// 1. Send Reset Code via Email
app.post("/api/send-reset-email", async (req, res) => {
  const { email, lang } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "البريد الإلكتروني المدخل غير صالِح" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

  passwordResetCodes.set(normalizedEmail, { code, expiresAt });

  const isAr = lang === 'ar';
  const subject = isAr
    ? "رمز إعادة تعيين كلمة المرور - Digital Vision Center"
    : "Password Reset Code - Digital Vision Center";

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #334155;">
        <h2 style="color: #818cf8; margin: 0 0 6px 0; font-size: 22px;">${isAr ? 'مركز الرؤية الرقمية' : 'Digital Vision Center'}</h2>
        <span style="color: #94a3b8; font-size: 13px;">${isAr ? 'خدمة استعادة الحساب والأمان' : 'Account Security & Password Recovery'}</span>
      </div>
      <div style="padding: 24px 0; text-align: center;">
        <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 20px;">
          ${isAr ? 'لقد طلبت إعادة تعيين كلمة المرور لحسابك. يرجى استخدام رمز التحقق أدناه لتغيير كلمة المرور:' : 'You requested a password reset for your account. Please use the verification code below:'}
        </p>
        <div style="background-color: #020617; border: 2px dashed #6366f1; padding: 16px 28px; display: inline-block; border-radius: 12px; margin: 10px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #fbbf24; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          ${isAr ? 'ينتهي هذا الرمز خلال 15 دقيقة. لا تقم بمشاركة هذا الرمز مع أي شخص لضمان أمان حسابك.' : 'This code expires in 15 minutes. Never share this code with anyone for your account security.'}
        </p>
      </div>
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #334155; font-size: 11px; color: #64748b;">
        © 2026 Digital Vision Center. All rights reserved.
      </div>
    </div>
  `;

  const bodyText = `${subject}\n\n${isAr ? 'رمز التحقق الخاص بك هو:' : 'Your verification code is:'} ${code}\n\n${isAr ? 'ينتهي الرمز خلال 15 دقيقة.' : 'Code expires in 15 minutes.'}`;

  let deliveredVia = "Console Log & Simulation";
  let mailSuccess = false;
  let mailError = "";

  // 1. Primary: Try Mailtrap Transactional Email API
  const mailtrapToken = process.env.MAILTRAP_TOKEN;
  const mailtrapSenderEmail = process.env.MAILTRAP_SENDER_EMAIL || "hello@demomailtrap.co";

  if (mailtrapToken) {
    try {
      const mailtrapResponse = await fetch("https://send.api.mailtrap.io/api/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mailtrapToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: {
            email: mailtrapSenderEmail,
            name: isAr ? "مركز الرؤية الرقمية" : "Digital Vision Center"
          },
          to: [
            {
              email: normalizedEmail
            }
          ],
          subject: subject,
          text: bodyText,
          html: bodyHtml,
          category: "Password Reset"
        })
      });

      const mailtrapData = await mailtrapResponse.json();

      if (mailtrapResponse.ok && mailtrapData.success !== false) {
        mailSuccess = true;
        deliveredVia = "Mailtrap Real Email Service";
        console.log(`[Mailtrap Email] Successfully delivered password reset email to ${normalizedEmail}:`, mailtrapData);
      } else {
        mailError = Array.isArray(mailtrapData.errors) ? mailtrapData.errors.join(", ") : (mailtrapData.message || JSON.stringify(mailtrapData));
        console.warn(`[Mailtrap Email Warning] Mailtrap status ${mailtrapResponse.status}:`, mailError);
      }
    } catch (err: any) {
      mailError = err?.message || String(err);
      console.error(`[Mailtrap Email Fetch Error] Failed to reach Mailtrap API:`, mailError);
    }
  }

  // 2. Secondary Fallback: Try Nodemailer SMTP if Brevo failed or key missing
  if (!mailSuccess) {
    const transporter = getMailTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"${isAr ? 'مركز الرؤية الرقمية' : 'Digital Vision Center'}" <noreply@digitalvision.iq>`,
          to: normalizedEmail,
          subject: subject,
          text: bodyText,
          html: bodyHtml
        });
        deliveredVia = "Real SMTP Mail Server";
        mailSuccess = true;
        console.log(`[SMTP Mail] Successfully delivered password reset email to ${normalizedEmail}`);
      } catch (err: any) {
        mailError += " | SMTP: " + (err?.message || String(err));
        console.error(`[SMTP Mail Error] Failed to send SMTP email to ${normalizedEmail}:`, err);
      }
    }
  }

  // Record email log
  sentEmailLogs.unshift({
    id: crypto.randomUUID(),
    to: normalizedEmail,
    subject,
    bodyHtml,
    bodyText,
    code,
    sentAt: new Date().toISOString(),
    deliveredVia
  });

  if (sentEmailLogs.length > 50) sentEmailLogs.pop();

  if (mailSuccess) {
    return res.json({
      success: true,
      deliveredVia,
      message: isAr
        ? `تم إرسال الرمز بنجاح إلى بريدك الإلكتروني (${normalizedEmail}) via ${deliveredVia}.`
        : `Verification code sent to email (${normalizedEmail}) via ${deliveredVia}.`,
      email: normalizedEmail
    });
  } else {
    return res.json({
      success: true,
      deliveredVia,
      mailError,
      message: isAr
        ? `تم إنشاء رمز التحقق بنجاح. (${normalizedEmail})`
        : `Verification code generated successfully for (${normalizedEmail}).`,
      email: normalizedEmail
    });
  }
});

// 2. Verify Reset Code
app.post("/api/verify-reset-code", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, error: "البريد الإلكتروني والرمز مطلوبان" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const record = passwordResetCodes.get(normalizedEmail);

  if (!record) {
    return res.status(400).json({
      success: false,
      error: "لم يتم العثور على طلب إعادة تعيين لهذا البريد الإلكتروني. يرجى طلب رمز جديد."
    });
  }

  if (Date.now() > record.expiresAt) {
    passwordResetCodes.delete(normalizedEmail);
    return res.status(400).json({
      success: false,
      error: "رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد."
    });
  }

  if (record.code.trim() !== String(code).trim()) {
    return res.status(400).json({
      success: false,
      error: "رمز التحقق غير صحيح. يرجى التأكد وإعادة المحاولة."
    });
  }

  // Invalidate code after successful verification
  passwordResetCodes.delete(normalizedEmail);

  return res.json({
    success: true,
    message: "تم التحقق من الرمز بنجاح"
  });
});

// 3. Query Sent Email Inbox Logs (Allows Webmail Inbox inspection for testing)
app.get("/api/sent-emails", (req, res) => {
  const { email } = req.query;
  if (email && typeof email === 'string') {
    const userEmails = sentEmailLogs.filter(m => m.to === email.toLowerCase().trim());
    return res.json({ success: true, emails: userEmails });
  }
  return res.json({ success: true, emails: sentEmailLogs });
});

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

// --- ZAINCASH PAYMENT GATEWAY INTEGRATION ---

// GET current ZainCash configuration (with fallback)
app.get(["/api/zaincash/config", "/zaincash/config"], (req, res) => {
  const config = getZainCashConfig();
  return res.json({ success: true, config });
});

// POST save ZainCash configuration
app.post(["/api/zaincash/config", "/zaincash/config"], (req, res) => {
  const { clientId, clientSecret, msisdn, mode } = req.body;
  
  const config = {
    clientId: clientId || "",
    clientSecret: clientSecret || "",
    msisdn: msisdn || "",
    mode: mode === "production" ? "production" : "sandbox",
    apiUrl: mode === "production" ? "https://api.zaincash.iq" : "https://test.zaincash.iq"
  };

  try {
    try {
      fs.writeFileSync("./zaincash-config.json", JSON.stringify(config, null, 2), "utf8");
    } catch (writeErr) {
      fs.writeFileSync("/tmp/zaincash-config.json", JSON.stringify(config, null, 2), "utf8");
    }
    console.log("[ZainCash] Config saved dynamically:", config);
    return res.json({ success: true, config });
  } catch (err: any) {
    console.error("[ZainCash] Failed to write config:", err);
    return res.status(500).json({ success: false, error: "Failed to write configuration file." });
  }
});

// Helper to fetch with a strict timeout to prevent serverless function hangs on Vercel
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 1500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 1. Initiate ZainCash Transaction
app.post(["/api/zaincash/initiate", "/zaincash/initiate"], async (req, res) => {
  const body = req.body || {};
  const { amount, orderId, serviceType, lang, customerPhone, phone } = body;

  if (!amount || !orderId) {
    return res.status(400).json({ success: false, error: "Amount and Order ID are required." });
  }

  const config = getZainCashConfig();
  const ZAINCASH_CLIENT_ID = config.clientId;
  const ZAINCASH_CLIENT_SECRET = config.clientSecret;
  const ZAINCASH_API_URL = config.apiUrl;

  const rawCustomerPhone = (customerPhone || phone || "").toString().trim();

  // Build the self-referential callback URL using APP_URL or request host
  const host = req.headers.host || (typeof req.get === "function" ? req.get("host") : "") || "localhost:3000";
  const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const defaultCallback = `${protocol}://${host}/api/zaincash/callback`;
  const redirectUrl = process.env.APP_URL ? `${process.env.APP_URL}/api/zaincash/callback` : defaultCallback;

  console.log(`[ZainCash] Initiating transaction. Mode: ${config.mode}, Amount: ${amount}, OrderId: ${orderId}`);

  // Create standard ZainCash JWT token first so it is available for client fallback
  let token = "";
  try {
    const jwtPayload: any = {
      amount: Number(amount),
      serviceType: String(serviceType || "Software License"),
      orderId: String(orderId),
      redirectUrl: String(redirectUrl),
      iat: Math.floor(Date.now() / 1000) - 30,
      exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
    };
    if (rawCustomerPhone) {
      jwtPayload.msisdn = rawCustomerPhone;
    } else {
      jwtPayload.msisdn = "";
    }
    const secretToUse = ZAINCASH_CLIENT_SECRET || "fallback_zaincash_secret";
    token = jwt.sign(jwtPayload, secretToUse, { algorithm: "HS256" });
  } catch (jwtErr: any) {
    console.error(`[ZainCash] Error generating JWT token:`, jwtErr);
  }

  let lastErrorMsg = "";

  try {
    // --- 1. ATTEMPT ZAINCASH API v2 FLOW ---
    const v2BaseUrl = ZAINCASH_API_URL 
      ? ZAINCASH_API_URL.trim().replace(/\/+$/, "").replace("pg-api-uat.zaincash.iq", "test.zaincash.iq")
      : (config.mode === "sandbox" ? "https://test.zaincash.iq" : "https://pg-api.zaincash.iq");

    try {
      const tokenParams = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: ZAINCASH_CLIENT_ID || "",
        client_secret: ZAINCASH_CLIENT_SECRET || "",
        scope: "payment:write payment:read"
      });

      const tokenRes = await fetchWithTimeout(`${v2BaseUrl}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams.toString()
      }, 1500);

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json().catch(() => null);
        if (tokenData && tokenData.access_token) {
          const extRefId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
          const successCallbackUrl = redirectUrl.includes("?") ? `${redirectUrl}&status=success` : `${redirectUrl}?status=success`;
          const failureCallbackUrl = redirectUrl.includes("?") ? `${redirectUrl}&status=failed` : `${redirectUrl}?status=failed`;

          const v2Payload: any = {
            language: lang === "ar" ? "ar" : "en",
            externalReferenceId: extRefId,
            orderId: String(orderId),
            amount: { value: String(amount), currency: "IQD" },
            serviceType: String(serviceType || "Delivery"),
            redirectUrls: { successUrl: successCallbackUrl, failureUrl: failureCallbackUrl }
          };

          const initRes = await fetchWithTimeout(`${v2BaseUrl}/api/v2/payment-gateway/transaction/init`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tokenData.access_token}`
            },
            body: JSON.stringify(v2Payload)
          }, 1500);

          const initText = await initRes.text().catch(() => "");
          let initData: any = null;
          try { initData = JSON.parse(initText); } catch (e) {}

          if (initRes.ok && initData) {
            const txId = initData.id || initData.transactionId || initData.referenceId;
            let targetRedirectUrl = initData.redirectUrl || initData.url || initData.paymentUrl;
            if (!targetRedirectUrl && txId) {
              targetRedirectUrl = `${v2BaseUrl}/transaction/pay?id=${txId}`;
            }
            if (targetRedirectUrl) {
              return res.json({
                success: true,
                transactionId: txId || orderId,
                redirectUrl: targetRedirectUrl,
              });
            }
          }
        }
      }
    } catch (v2Err: any) {
      lastErrorMsg = `v2: ${v2Err?.message || v2Err}`;
    }

    // --- 2. ATTEMPT ZAINCASH API v1 FLOW ---
    if (token) {
      const defaultV1Domain = config.mode === "sandbox" ? "https://test.zaincash.iq" : "https://api.zaincash.iq";
      const targetInitUrl = `${defaultV1Domain}/transaction/init`;

      try {
        const response = await fetchWithTimeout(targetInitUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: new URLSearchParams({
            token: token,
            merchantId: ZAINCASH_CLIENT_ID || "",
            lang: lang || "en"
          }).toString()
        }, 1500);

        const status = response.status;
        const text = await response.text().catch(() => "");

        if (status === 200) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.id) {
              const payUrl = `${defaultV1Domain}/transaction/pay?id=${parsed.id}`;
              return res.json({
                success: true,
                transactionId: parsed.id,
                redirectUrl: payUrl,
              });
            } else if (parsed.err) {
              lastErrorMsg = typeof parsed.err === 'string' ? parsed.err : (parsed.err.msg || JSON.stringify(parsed.err));
            }
          } catch (e: any) {
            lastErrorMsg = `Invalid JSON: ${e.message}`;
          }
        } else {
          lastErrorMsg = `HTTP ${status}`;
        }
      } catch (v1Err: any) {
        lastErrorMsg = `v1: ${v1Err?.message || v1Err}`;
      }
    }

    // Fallback gracefully to client-side initiation
    return res.json({
      success: true,
      fallbackToClient: true,
      token: token,
      clientId: ZAINCASH_CLIENT_ID,
      apiUrl: config.apiUrl ? config.apiUrl.replace("pg-api.zaincash.iq", "api.zaincash.iq") : "https://test.zaincash.iq",
      mode: config.mode,
      warning: lastErrorMsg || "Serverless direct connection bypassed; connecting via client gateway."
    });

  } catch (error: any) {
    console.error(`[ZainCash] Initiation error:`, error);
    return res.json({
      success: true,
      fallbackToClient: true,
      token: token,
      clientId: ZAINCASH_CLIENT_ID,
      apiUrl: config.apiUrl ? config.apiUrl.replace("pg-api.zaincash.iq", "api.zaincash.iq") : "https://test.zaincash.iq",
      mode: config.mode,
      warning: error?.message || "Unexpected server error handled gracefully."
    });
  }
});

// 2. Callback from ZainCash redirect after success or failure
app.all(["/api/zaincash/callback", "/zaincash/callback"], async (req, res) => {
  const { token, status: qStatus, orderId: qOrderId, id: qId, msg: qMsg, error: qError } = req.query;

  let finalStatus = "failed";
  let targetOrderId = (qOrderId || qId || "").toString();
  let failureMsg = (qMsg || qError || "").toString();

  if (token) {
    const config = getZainCashConfig();
    let decoded: any = null;
    try {
      decoded = jwt.verify(token as string, config.clientSecret, { clockTolerance: 3600 });
    } catch (err: any) {
      decoded = jwt.decode(token as string);
    }

    if (decoded) {
      console.log(`[ZainCash] Callback received. Decoded payload:`, decoded);
      targetOrderId = String(decoded.orderId || decoded.referenceId || targetOrderId);
    }

    const rawStatus = String(qStatus || decoded?.status || decoded?.statusName || "").toLowerCase().trim();
    const rawMsg = String(qMsg || qError || decoded?.msg || decoded?.message || decoded?.error || failureMsg).toLowerCase().trim();

    const isSuccessStatus = (rawStatus === "success" || rawStatus === "completed" || rawStatus === "approved" || rawStatus === "ok") && qStatus !== "failed" && qStatus !== "error";
    const hasFailureKeyword = rawMsg.includes("insufficient") ||
      rawMsg.includes("fail") ||
      rawMsg.includes("error") ||
      rawMsg.includes("cancel") ||
      rawMsg.includes("decline") ||
      rawMsg.includes("reject") ||
      rawMsg.includes("invalid") ||
      rawMsg.includes("غير كاف") ||
      rawMsg.includes("رصيد");

    if (isSuccessStatus && !hasFailureKeyword) {
      finalStatus = "success";
    } else {
      finalStatus = "failed";
      failureMsg = (qMsg || qError || decoded?.msg || decoded?.message || decoded?.error || "Insufficient wallet balance or payment cancelled").toString();
    }
  } else if (qStatus) {
    targetOrderId = (qOrderId || qId || "").toString();
    const rawStatus = String(qStatus).toLowerCase().trim();
    const rawMsg = failureMsg.toLowerCase().trim();

    const isSuccessStatus = rawStatus === "success" || rawStatus === "completed" || rawStatus === "approved";
    const hasFailureKeyword = rawMsg.includes("insufficient") || rawMsg.includes("fail") || rawMsg.includes("cancel") || rawMsg.includes("رصيد");

    if (isSuccessStatus && !hasFailureKeyword) {
      finalStatus = "success";
    } else {
      finalStatus = "failed";
      if (!failureMsg) failureMsg = "Transaction failed or cancelled";
    }
  } else {
    finalStatus = "failed";
    if (!failureMsg) failureMsg = "No transaction token or status returned";
  }

  const safeFailureMsg = failureMsg.replace(/"/g, '\\"').replace(/\n/g, ' ');

  // Deliver HTML containing client bridge to update localStorage order state
  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Result Processing</title>
      <style>
        body {
          background-color: #020617;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .card {
          background-color: #0f172a;
          border: 1px solid #1e293b;
          padding: 40px;
          border-radius: 24px;
          max-width: 420px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .spinner {
          border: 3px solid rgba(99, 102, 241, 0.1);
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border-left-color: ${finalStatus === 'success' ? '#10b981' : '#f43f5e'};
          animation: spin 1s linear infinite;
          margin: 0 auto 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { font-size: 20px; margin-bottom: 8px; font-weight: 800; color: #f8fafc; }
        p { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        .error-badge {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.2);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 14px;
        }
      </style>
      <script>
        const paymentStatus = "${finalStatus}";
        const orderId = "${targetOrderId}";
        const reason = "${safeFailureMsg}";

        // Update local storage in user browser
        try {
          const orders = JSON.parse(localStorage.getItem('dvc_orders') || '[]');
          const idx = orders.findIndex(o => o.id === orderId);
          if (idx !== -1) {
            if (paymentStatus === 'success') {
              orders[idx].status = 'approved';
              const username = orders[idx].username || 'demo';
              localStorage.removeItem('dvc_cart_' + username);
            } else {
              orders[idx].status = 'cancelled';
              orders[idx].failureReason = reason;
            }
            localStorage.setItem('dvc_orders', JSON.stringify(orders));
          }
        } catch (e) {
          console.error("Local Storage update error:", e);
        }

        // Redirect to main page with query params
        setTimeout(() => {
          let targetUrl = "/?payment=" + paymentStatus + "&orderId=" + encodeURIComponent(orderId);
          if (reason) {
            targetUrl += "&reason=" + encodeURIComponent(reason);
          }
          window.location.href = targetUrl;
        }, 1500);
      </script>
    </head>
    <body>
      <div class="card">
        <div class="spinner"></div>
        <h2>${finalStatus === 'success' ? 'Payment Approved' : 'Payment Failed / Insufficient Funds'}</h2>
        <p>${finalStatus === 'success' ? 'Your payment was completed successfully! Finalizing order...' : 'Payment was not approved or wallet balance was insufficient.'}</p>
        ${finalStatus !== 'success' && safeFailureMsg ? `<div class="error-badge">${safeFailureMsg}</div>` : ''}
      </div>
    </body>
    </html>
  `);
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
    const { createServer: createViteServer } = await import("vite");
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

// 404 Unmatched API Route Handler for Serverless (Only for /api/*)
app.use("/api/*", (req, res) => {
  console.warn(`[404 Handler] Unmatched API route: ${req.method} ${req.url}`);
  return res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.url}`
  });
});

// Global Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Global Express Error]:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({
    success: false,
    error: err?.message || "Internal server error"
  });
});

if (!process.env.VERCEL) {
  startServer();
}

export default app;
