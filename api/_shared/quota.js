const { getConfig } = require("./config");

const CACHE = {
  lastTableCheck: 0,
};

function periodStartKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function nextResetIso(date = new Date()) {
  const reset = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return reset.toISOString();
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    data = null;
  }
  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && data.message) ||
      response.statusText ||
      "Unknown error";
    const error = new Error(String(message));
    error.status = response.status;
    error.response = response;
    throw error;
  }
  return data;
}

async function ensureTableExists(config) {
  const now = Date.now();
  if (now - CACHE.lastTableCheck < 5 * 60 * 1000) {
    return;
  }

  const adminUrl = `${config.supabaseUrl}/rest/v1/rpc/create_api_usage_table_if_needed`;
  try {
    await fetchJson(adminUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    // ignore 404 - the function might not exist yet; instructions will guide setup
  }
  CACHE.lastTableCheck = now;
}

async function getUsage(config, userId, periodKey) {
  const url = new URL(`${config.supabaseUrl}/rest/v1/api_usage`);
  url.searchParams.set("select", "id,user_id,period_start,request_count");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("period_start", `eq.${periodKey}`);
  url.searchParams.set("limit", "1");

  const data = await fetchJson(url.toString(), {
    method: "GET",
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });

  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return null;
}

async function insertUsage(config, userId, periodKey, weight, nowIso) {
  const url = `${config.supabaseUrl}/rest/v1/api_usage`;
  const body = {
    user_id: userId,
    period_start: periodKey,
    request_count: weight,
    last_request_at: nowIso,
  };

  const data = await fetchJson(url, {
    method: "POST",
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  return Array.isArray(data) ? data[0] : data;
}

async function updateUsage(config, usageRow, weight, nowIso) {
  const url = new URL(`${config.supabaseUrl}/rest/v1/api_usage`);
  url.searchParams.set("id", `eq.${usageRow.id}`);

  const body = {
    request_count: usageRow.request_count + weight,
    last_request_at: nowIso,
  };

  const data = await fetchJson(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  return Array.isArray(data) ? data[0] : data;
}

async function consumeQuota(userId, weight) {
  const config = getConfig();
  await ensureTableExists(config);

  const now = new Date();
  const nowIso = now.toISOString();
  const periodKey = periodStartKey(now);
  const limit = config.dailyLimit;

  let usageRow;
  try {
    usageRow = await getUsage(config, userId, periodKey);
  } catch (err) {
    throw new Error("Quota storage is unavailable. Check Supabase configuration.");
  }
  if (!usageRow) {
    if (weight > limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt: nextResetIso(now),
        total: 0,
      };
    }
    try {
      usageRow = await insertUsage(config, userId, periodKey, weight, nowIso);
    } catch (err) {
      throw new Error("Failed to record quota usage. Ensure the api_usage table exists and credentials are valid.");
    }
    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - (usageRow?.request_count || weight), 0),
      resetAt: nextResetIso(now),
      total: usageRow?.request_count || weight,
    };
  }

  const current = usageRow.request_count || 0;
  if (current + weight > limit) {
    return {
      allowed: false,
      limit,
      remaining: Math.max(limit - current, 0),
      resetAt: nextResetIso(now),
      total: current,
    };
  }

  let updated;
  try {
    updated = await updateUsage(config, usageRow, weight, nowIso);
  } catch (err) {
    throw new Error("Failed to update quota usage. Ensure the api_usage table exists and credentials are valid.");
  }
  const total = updated?.request_count || current + weight;
  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - total, 0),
    resetAt: nextResetIso(now),
    total,
  };
}

module.exports = {
  consumeQuota,
  periodStartKey,
  nextResetIso,
};
