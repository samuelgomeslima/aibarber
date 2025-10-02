const OpenAI = require('openai');

function getProvidedToken(req) {
  if (!req?.headers) return null;
  const headers = req.headers;
  return headers['x-api-key'] || headers['x-functions-key'] || headers['x-functions-clientid'] || null;
}

function ensureConfigured(context) {
  if (process.env.OPENAI_API_KEY) {
    return null;
  }
  context.log.error('Missing OPENAI_API_KEY configuration.');
  context.res = {
    status: 500,
    body: {
      error: 'Server misconfiguration: missing OpenAI credentials.',
    },
  };
  return context.res;
}

function ensureAuthorized(context, req) {
  const configuredToken = process.env.IMAGE_API_TOKEN;
  if (!configuredToken) return null;
  const providedToken = getProvidedToken(req);
  if (configuredToken === providedToken) {
    return null;
  }

  context.res = {
    status: 401,
    body: {
      error: 'Unauthorized request.',
    },
  };
  return context.res;
}

function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

module.exports = {
  ensureConfigured,
  ensureAuthorized,
  createOpenAIClient,
};
