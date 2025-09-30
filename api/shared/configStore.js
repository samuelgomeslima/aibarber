const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const DEFAULT_STORAGE_PATH = path.join(os.tmpdir(), 'supabase-config.json');

function getStoragePath() {
  const customPath = process.env.SUPABASE_CONFIG_PATH;
  if (customPath) {
    return path.isAbsolute(customPath)
      ? customPath
      : path.join(process.cwd(), customPath);
  }

  return DEFAULT_STORAGE_PATH;
}

async function ensureStorageDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function readStoredConfig(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeStoredConfig(filePath, data) {
  await ensureStorageDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function getSupabaseConfig() {
  const filePath = getStoragePath();
  const fromFile = await readStoredConfig(filePath);

  if (fromFile && typeof fromFile.supabaseUrl === 'string') {
    return fromFile;
  }

  const fallbackUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';

  if (!fallbackUrl) {
    return { supabaseUrl: '' };
  }

  const fallbackConfig = { supabaseUrl: fallbackUrl };
  try {
    await writeStoredConfig(filePath, fallbackConfig);
  } catch (error) {
    if (error.code !== 'EACCES') {
      throw error;
    }
  }

  return fallbackConfig;
}

async function updateSupabaseConfig(supabaseUrl) {
  if (typeof supabaseUrl !== 'string' || !supabaseUrl.trim()) {
    throw new Error('A non-empty Supabase URL is required.');
  }

  const filePath = getStoragePath();
  const data = { supabaseUrl: supabaseUrl.trim() };
  await writeStoredConfig(filePath, data);
  return data;
}

module.exports = {
  getSupabaseConfig,
  updateSupabaseConfig,
};
