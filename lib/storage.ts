import { createSupabaseServerClient, useDemoData } from './supabase';

export async function uploadRequestFile(requestId: string, file: File) {
  if (useDemoData) {
    return { path: `demo/${requestId}/${file.name}`, publicUrl: '#' };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase is not configured.');

  const filePath = `${requestId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('request-media').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from('request-media').getPublicUrl(filePath);
  return { path: filePath, publicUrl: data.publicUrl };
}
