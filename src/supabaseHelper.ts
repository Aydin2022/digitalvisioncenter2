/**
 * Tests connection to the Supabase client by making a simple request on the backend.
 */
export async function testConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/supabase/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, key }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || `Server returned error status ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e?.message || 'Server connection error' };
  }
}

/**
 * Lists registered users. Requires a service_role key to work on the backend.
 */
export async function fetchUsers(url: string, serviceRoleKey: string) {
  try {
    const res = await fetch('/api/supabase/fetch-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, serviceRoleKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Server returned error status ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Server connection error' };
  }
}

/**
 * Attempts to provision the admin user using the administrative Auth API (service_role) on the server.
 */
export async function createAdminUserWithServiceRole(
  url: string,
  serviceRoleKey: string,
  email: string,
  password: string,
  username: string
) {
  try {
    const res = await fetch('/api/supabase/create-admin-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        serviceRoleKey,
        email,
        password,
        username,
        useServiceKey: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Server returned error status ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Server connection error' };
  }
}

/**
 * Standard public sign-up for cases where the service role key is not working/available.
 */
export async function createAdminUserWithSignUp(
  url: string,
  anonKey: string,
  email: string,
  password: string,
  username: string
) {
  try {
    const res = await fetch('/api/supabase/create-admin-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        anonKey,
        email,
        password,
        username,
        useServiceKey: false,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Server returned error status ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Server connection error' };
  }
}

/**
 * Triggers database schema querying via REST API from the server.
 */
export async function testDatabaseAccess(url: string, key: string): Promise<{ success: boolean; tables: string[]; message: string }> {
  try {
    const res = await fetch('/api/supabase/test-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, key }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, tables: [], message: err.message || `Server returned error status ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      tables: [],
      message: e?.message || 'Server connection error',
    };
  }
}

/**
 * Deletes user via administrative API (service_role) on the backend.
 */
export async function deleteUserOnServer(url: string, serviceRoleKey: string, userId: string) {
  try {
    const res = await fetch('/api/supabase/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, serviceRoleKey, userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Server returned error status ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Server connection error' };
  }
}

/**
 * Log in a user via email and password using the Supabase API proxy.
 */
export async function loginUser(url: string, anonKey: string, email: string, password: string) {
  try {
    const res = await fetch('/api/supabase/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, anonKey, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `Server returned error status ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Server connection error' };
  }
}
