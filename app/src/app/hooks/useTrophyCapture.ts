'use client';

import { useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { captureShareCard } from '@/app/lib/shareUtils';
import { ShareableMoment } from '@/app/types/sharing';

export function useTrophyCapture() {
  const captureAndUpload = useCallback(async (momentId: string): Promise<string | undefined> => {
    let imageUrl: string | undefined = undefined;
    const blob = await captureShareCard('tcg-capture-area');
    
    if (blob) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const fileName = `${user.id}/${momentId}.png`;
          const { error } = await supabase.storage.from('trophies').upload(fileName, blob, {
            contentType: 'image/png'
          });
          if (!error) {
            const { data } = supabase.storage.from('trophies').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
          }
        }
      } catch (e) {
        console.error('[TCG] Storage upload failed:', e);
      }
    }
    
    return imageUrl;
  }, []);

  return { captureAndUpload };
}
