const { ensureConfigured, ensureAuthorized, createOpenAIClient } = require('../_shared/openaiClient');

function toBuffer(dataUrlOrBase64) {
  if (typeof dataUrlOrBase64 !== 'string' || !dataUrlOrBase64.trim()) {
    return null;
  }
  const commaIndex = dataUrlOrBase64.indexOf(',');
  const base64 = commaIndex !== -1 ? dataUrlOrBase64.slice(commaIndex + 1) : dataUrlOrBase64;
  try {
    return Buffer.from(base64, 'base64');
  } catch (error) {
    return null;
  }
}

module.exports = async function (context, req) {
  context.log('AudioTranscription function processed a request.');

  if (ensureConfigured(context)) {
    return;
  }
  if (ensureAuthorized(context, req)) {
    return;
  }

  const {
    file,
    fileName = 'voice-message.webm',
    mimeType = 'audio/webm',
    model = 'gpt-4o-mini-transcribe',
    temperature,
    response_format,
    language,
  } = req.body || {};

  const buffer = toBuffer(file);
  if (!buffer || buffer.length === 0) {
    context.res = {
      status: 400,
      body: {
        error: 'Request must include a base64-encoded "file" field.',
      },
    };
    return;
  }

  const client = createOpenAIClient();

  try {
    const response = await client.audio.transcriptions.create({
      model,
      file: {
        data: buffer,
        name: fileName,
      },
      mimeType,
      temperature,
      response_format,
      language,
    });

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: response,
    };
  } catch (error) {
    context.log.error('Failed to transcribe audio', error);
    const status = error.status ?? 500;
    context.res = {
      status,
      body: {
        error: 'Failed to transcribe audio.',
        details: error.message,
      },
    };
  }
};
