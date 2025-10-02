const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function missingConfiguration(context, message) {
  context.log.error(message);
  return {
    status: 500,
    body: {
      error: message,
    },
  };
}

function unauthorizedResponse() {
  return {
    status: 401,
    body: {
      error: 'Unauthorized request.',
    },
  };
}

function badRequest(message) {
  return {
    status: 400,
    body: {
      error: message,
    },
  };
}

function success(body) {
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  };
}

async function handleChatCompletion(body) {
  const { messages, model = 'gpt-4o-mini', temperature = 0 } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return badRequest('Request body must include a non-empty "messages" array.');
  }

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
  });

  const choice = response?.choices?.[0];
  if (!choice) {
    throw new Error('OpenAI returned no choices for the chat completion request.');
  }

  return success({
    choices: response.choices,
    choice,
    reply: choice.message?.content ?? '',
  });
}

async function handleTranscription(body) {
  const { audio, mimeType = 'audio/webm', fileName = 'voice-message.webm' } = body || {};
  if (typeof audio !== 'string' || audio.length === 0) {
    return badRequest('Request body must include a base64 encoded "audio" string.');
  }

  const buffer = Buffer.from(audio, 'base64');
  const file = await OpenAI.toFile(buffer, fileName, { contentType: mimeType });

  const transcription = await client.audio.transcriptions.create({
    model: 'gpt-4o-mini-transcribe',
    file,
  });

  const text = transcription?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('OpenAI did not return any transcription text.');
  }

  return success({
    text: text.trim(),
  });
}

module.exports = async function (context, req) {
  context.log('Assistant proxy invoked.');

  if (!process.env.OPENAI_API_KEY) {
    context.res = missingConfiguration(
      context,
      'Server misconfiguration: missing OpenAI credentials. Configure OPENAI_API_KEY in application settings.',
    );
    return;
  }

  const configuredToken = process.env.IMAGE_API_TOKEN;
  const providedToken = req.headers['x-api-key'] || req.headers['x-functions-key'];

  if (configuredToken && configuredToken !== providedToken) {
    context.res = unauthorizedResponse();
    return;
  }

  const actionRaw =
    (context.bindingData && context.bindingData.action) ||
    (req.query && (req.query.action || req.query.mode)) ||
    (req.body && (req.body.action || req.body.mode)) ||
    '';
  const action = String(actionRaw || '').toLowerCase();

  try {
    if (action === 'transcribe') {
      context.res = await handleTranscription(req.body);
      return;
    }

    context.res = await handleChatCompletion(req.body);
  } catch (error) {
    context.log.error('Assistant proxy failed', error);
    context.res = {
      status: error.status ?? 500,
      body: {
        error: 'Failed to fulfill assistant request.',
        details: error.message,
      },
    };
  }
};
