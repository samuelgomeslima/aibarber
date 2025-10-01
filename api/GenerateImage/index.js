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

  if (configuredToken && configuredToken !== providedToken) {
    context.res = {
      status: 401,
      body: {
        error: 'Unauthorized request.',
      },
    };
    return;
  }

  const { prompt, size = '1024x1024', quality = 'standard', response_format = 'b64_json' } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    context.res = {
      status: 400,
      body: {
        error: 'A non-empty "prompt" field is required in the request body.',
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
