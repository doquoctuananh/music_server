const fs = require('fs');
const path = require('path');
// Minimal mime mapping to avoid extra dependency
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // publishable/anon key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-side secret

if (!SUPABASE_URL) {
  console.warn('Supabase URL not found in environment variables. Supabase uploads will fail.');
}

// Prefer the service role key on the server for storage operations that require elevated privileges (uploads/deletes).
// Add SUPABASE_SERVICE_ROLE_KEY to your .env (from Supabase project -> Settings -> API -> Service key).
const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY || '';
if (!effectiveKey) {
  console.warn('No Supabase key found in environment variables. Supabase uploads will fail.');
}

const supabase = createClient(SUPABASE_URL || '', effectiveKey, {
  // keep default options
});

const BUCKET = 'songs';

async function uploadFile(localFilePath, destPath) {
  if (!fs.existsSync(localFilePath)) {
    throw new Error('Local file does not exist: ' + localFilePath);
  }

  const fileStream = fs.createReadStream(localFilePath);
  const ext = path.extname(localFilePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';

  const { data, error } = await supabase.storage.from(BUCKET).upload(destPath, fileStream, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(destPath);

  return {
    publicUrl: publicData && publicData.publicUrl ? publicData.publicUrl : null,
    storagePath: destPath,
    meta: data,
  };
}

async function removeFile(storagePath) {
  if (!storagePath) return { error: null };
  const { data, error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  return { data, error };
}

module.exports = {
  uploadFile,
  removeFile,
  client: supabase,
};
