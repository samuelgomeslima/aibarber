const REQUIRED_ENV = ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

function getConfig() {
  const missing = REQUIRED_ENV.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const dailyLimit = Number.parseInt(process.env.API_DAILY_REQUEST_LIMIT || "100", 10);
  const chatCost = Number.parseInt(process.env.API_CHAT_COST || "1", 10);
  const transcriptionCost = Number.parseInt(process.env.API_TRANSCRIPTION_COST || "3", 10);

  return {
    openAiApiKey: process.env.OPENAI_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    chatCost: Number.isFinite(chatCost) && chatCost > 0 ? chatCost : 1,
    transcriptionCost:
      Number.isFinite(transcriptionCost) && transcriptionCost > 0 ? transcriptionCost : 3,
    dailyLimit: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 100,
    chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  };
}

module.exports = {
  getConfig,
};
