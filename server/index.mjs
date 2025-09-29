import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { File } from 'node:buffer';
import OpenAI from 'openai';

const PORT = Number.parseInt(process.env.PORT || '', 10) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable.');
  process.exit(1);
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const corsOrigins = (() => {
  if (!CORS_ORIGIN) return undefined;
  if (CORS_ORIGIN.trim() === '*') return '*';
  const origins = CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : undefined;
})();

app.use(cors(corsOrigins ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function normalizeError(error) {
  if (error instanceof OpenAI.APIError) {
    return {
      status: error.status ?? 500,
      message: error.error?.message || error.message || 'OpenAI request failed.',
    };
  }
  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }
  return { status: 500, message: 'Unexpected assistant backend error.' };
}

const CHAT_COMPLETION_OPTION_KEYS = new Set([
  'frequency_penalty',
  'max_tokens',
  'presence_penalty',
  'response_format',
  'stop',
  'top_p',
]);
const CHAT_COMPLETION_NUMERIC_KEYS = new Set([
  'frequency_penalty',
  'max_tokens',
  'presence_penalty',
  'top_p',
]);

function coerceNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

app.post('/assistant/chat-completions', async (req, res) => {
  try {
    const { messages, model, temperature, ...rest } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: 'Request body must include a non-empty messages array.' },
      });
    }

    const extraOptions = {};
    for (const [key, value] of Object.entries(rest ?? {})) {
      if (!CHAT_COMPLETION_OPTION_KEYS.has(key)) {
        continue;
      }

      if (CHAT_COMPLETION_NUMERIC_KEYS.has(key)) {
        const numeric = coerceNumber(value);
        if (typeof numeric === 'number') {
          extraOptions[key] = numeric;
        }
        continue;
      }

      if (key === 'stop') {
        if (typeof value === 'string') {
          extraOptions[key] = value;
        } else if (Array.isArray(value)) {
          extraOptions[key] = value.filter((entry) => typeof entry === 'string');
        }
        continue;
      }

      extraOptions[key] = value;
    }

    const payload = {
      model: typeof model === 'string' && model.trim() ? model : 'gpt-4o-mini',
      temperature: coerceNumber(temperature),
      messages,
      ...extraOptions,
    };

    if (typeof payload.temperature !== 'number') {
      delete payload.temperature;
    }
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    const completion = await openai.chat.completions.create(payload);
    res.json(completion);
  } catch (error) {
    console.error('Chat completion error:', error);
    const { status, message } = normalizeError(error);
    res.status(status).json({ error: { message } });
  }
});

const AUDIO_TRANSCRIPTION_OPTION_KEYS = new Set(['language', 'prompt', 'response_format', 'temperature']);

app.post('/assistant/audio-transcriptions', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({
        error: { message: 'An audio file must be provided using the "file" field.' },
      });
    }

    const model = req.body?.model && typeof req.body.model === 'string' && req.body.model.trim()
      ? req.body.model
      : 'gpt-4o-mini-transcribe';

    const fileName = file.originalname || 'audio.webm';
    const mimeType = file.mimetype || 'audio/webm';

    const fileForOpenAI = new File([file.buffer], fileName, { type: mimeType });

    const transcriptionOptions = {};
    for (const key of AUDIO_TRANSCRIPTION_OPTION_KEYS) {
      if (key in (req.body ?? {})) {
        const value = req.body[key];
        transcriptionOptions[key] = key === 'temperature' ? coerceNumber(value) ?? undefined : value;
      }
    }
    if (typeof transcriptionOptions.temperature !== 'number') {
      delete transcriptionOptions.temperature;
    }
    for (const key of Object.keys(transcriptionOptions)) {
      if (transcriptionOptions[key] === undefined) {
        delete transcriptionOptions[key];
      }
    }

    const transcription = await openai.audio.transcriptions.create({
      model,
      file: fileForOpenAI,
      ...transcriptionOptions,
    });

    res.json(transcription);
  } catch (error) {
    console.error('Audio transcription error:', error);
    const { status, message } = normalizeError(error);
    res.status(status).json({ error: { message } });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Assistant proxy listening on http://localhost:${PORT}`);
});
