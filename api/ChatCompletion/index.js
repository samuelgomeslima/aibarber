const { ensureConfigured, ensureAuthorized, createOpenAIClient } = require('../_shared/openaiClient');

module.exports = async function (context, req) {
  context.log('ChatCompletion function processed a request.');

  if (ensureConfigured(context)) {
    return;
  }
  if (ensureAuthorized(context, req)) {
    return;
  }

  const { messages, model = 'gpt-4o-mini', temperature = 0.7, tools, tool_choice, response_format, max_tokens, frequency_penalty, presence_penalty, top_p } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    context.res = {
      status: 400,
      body: {
        error: 'The request body must include a non-empty "messages" array.',
      },
    };
    return;
  }

  const client = createOpenAIClient();

  try {
    const response = await client.chat.completions.create({
      messages,
      model,
      temperature,
      tools,
      tool_choice,
      response_format,
      max_tokens,
      frequency_penalty,
      presence_penalty,
      top_p,
    });

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: response,
    };
  } catch (error) {
    context.log.error('Failed to call OpenAI chat completion', error);
    const status = error.status ?? 500;
    context.res = {
      status,
      body: {
        error: 'Failed to run chat completion.',
        details: error.message,
      },
    };
  }
};
