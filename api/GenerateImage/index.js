const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async function (context, req) {
  context.log('GenerateImage function processed a request.');

  if (!process.env.OPENAI_API_KEY) {
    context.log.error('Missing OPENAI_API_KEY configuration.');
    context.res = {
      status: 500,
      body: {
        error: 'Server misconfiguration: missing OpenAI credentials.',
      },
    };
    return;
  }

  const configuredToken = process.env.IMAGE_API_TOKEN;
  const providedToken = req.headers['x-api-key'] || req.headers['x-functions-key'];

  if (!configuredToken) {
    context.log.error('Missing IMAGE_API_TOKEN configuration.');
    context.res = {
      status: 500,
      body: {
        error: 'Server misconfiguration: missing image API token.',
      },
    };
    return;
  }

  if (!providedToken || configuredToken !== providedToken) {
    context.res = {
      status: 401,
      body: {
        error: 'Unauthorized request.',
      },
    };
    return;
  }

  const {
    prompt,
    size = '1024x1024',
    quality = 'standard',
    response_format = 'b64_json',
  } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    context.res = {
      status: 400,
      body: {
        error: 'A non-empty "prompt" field is required in the request body.',
      },
    };
    return;
  }

  if (prompt.length > 1000) {
    context.res = {
      status: 400,
      body: {
        error: 'Prompt is too long. Limit to 1000 characters.',
      },
    };
    return;
  }

  const allowedSizes = new Set(['256x256', '512x512', '1024x1024']);
  if (!allowedSizes.has(size)) {
    context.res = {
      status: 400,
      body: {
        error: 'Invalid "size" requested.',
      },
    };
    return;
  }

  const allowedQualities = new Set(['standard', 'hd']);
  if (!allowedQualities.has(quality)) {
    context.res = {
      status: 400,
      body: {
        error: 'Invalid "quality" requested.',
      },
    };
    return;
  }

  if (response_format !== 'b64_json') {
    context.res = {
      status: 400,
      body: {
        error: 'Unsupported "response_format" requested.',
      },
    };
    return;
  }

  try {
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      size,
      quality,
      response_format,
    });

    const image = response.data?.[0];

    if (!image) {
      throw new Error('No image returned by OpenAI.');
    }

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        prompt,
        size,
        quality,
        response_format,
        data: image,
      },
    };
  } catch (error) {
    context.log.error('Failed to generate image', error);
    const status = error.status ?? 500;

    context.res = {
      status,
      body: {
        error: 'Failed to generate image.',
        details: error.message,
      },
    };
  }
};
