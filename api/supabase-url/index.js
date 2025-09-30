const { getSupabaseConfig, updateSupabaseConfig } = require('../shared/configStore');

const ALLOWED_ORIGINS = (process.env.SUPABASE_CONFIG_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function buildCorsHeaders(origin) {
  if (!origin) {
    return {};
  }

  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    };
  }

  return { 'Vary': 'Origin' };
}

function unauthorizedResponse(origin) {
  return {
    status: 401,
    headers: {
      ...buildCorsHeaders(origin),
    },
    body: {
      message: 'Unauthorized',
    },
  };
}

module.exports = async function (context, req) {
  const origin = req.headers?.origin;
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        ...corsHeaders,
      },
    };
    return;
  }

  try {
    if (req.method === 'GET') {
      const config = await getSupabaseConfig();
      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: config,
      };
      return;
    }

    if (req.method === 'PUT') {
      const token = process.env.SUPABASE_CONFIG_TOKEN;
      if (token) {
        const provided = req.headers?.authorization;
        if (!provided || !provided.startsWith('Bearer ') || provided.slice('Bearer '.length) !== token) {
          context.res = unauthorizedResponse(origin);
          return;
        }
      }

      const supabaseUrl = req.body?.supabaseUrl;
      if (typeof supabaseUrl !== 'string' || !supabaseUrl.trim()) {
        context.res = {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
          body: {
            message: 'The request body must include a non-empty "supabaseUrl" value.',
          },
        };
        return;
      }

      const updated = await updateSupabaseConfig(supabaseUrl);
      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: updated,
      };
      return;
    }

    context.res = {
      status: 405,
      headers: {
        'Allow': 'GET,PUT,OPTIONS',
        ...corsHeaders,
      },
      body: {
        message: `Method ${req.method} not allowed`,
      },
    };
  } catch (error) {
    context.log('Failed to handle supabase-url request', error);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: {
        message: 'Unexpected error fetching Supabase configuration.',
      },
    };
  }
};
