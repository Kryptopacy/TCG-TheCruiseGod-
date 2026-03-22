'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const displayName = formData.get('displayName') as string
  const wingmanPreferences = formData.get('wingmanPreferences') as string

  const { error } = await supabase.auth.updateUser({
    data: { 
      display_name: displayName,
      wingman_preferences: wingmanPreferences
    }
  })

  if (error) {
    redirect(`/profile?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/profile')
  redirect('/profile?message=Profile updated successfully!')
}
