import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { updateProfile } from './actions'
import { logout } from '../login/actions'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName = user.user_metadata?.display_name || ''
  const wingmanPreferences = user.user_metadata?.wingman_preferences || ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4rem 2rem',
      minHeight: '100vh',
      gap: '2rem'
    }}>
      <div className="glass-card-heavy" style={{ padding: '2rem', width: '100%', maxWidth: '600px' }}>
        <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Wingman Profile</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Logged in as <strong>{user.email}</strong>
        </p>
        
        {message && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            background: message.includes('success') ? 'rgba(105, 240, 174, 0.1)' : 'rgba(255, 82, 82, 0.1)',
            border: `1px solid ${message.includes('success') ? 'var(--accent-green)' : 'var(--accent-red)'}`,
            color: message.includes('success') ? 'var(--accent-green)' : 'var(--accent-red)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {message}
          </div>
        )}
        
        <form action={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="displayName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>What should TCG call you?</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Your wingman will natively use this name during voice chats.
            </p>
            <input 
              id="displayName" 
              name="displayName" 
              type="text"
              defaultValue={displayName}
              placeholder="e.g. John, Boss, The Legend"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white'
              }}
            />
          </div>

          <div>
            <label htmlFor="wingmanPreferences" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Wingman Protocols & Vibe</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Secret instructions for your AI wingman (e.g., "Always suggest dive bars", "Keep it strictly PG", "Roast me constantly").
            </p>
            <textarea 
              id="wingmanPreferences" 
              name="wingmanPreferences" 
              rows={4}
              defaultValue={wingmanPreferences}
              placeholder="Your preferences here..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'space-between' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Save Profile</button>
            <button formAction={logout} className="btn-secondary" style={{ padding: '0.75rem 2rem' }}>Sign Out</button>
          </div>
        </form>
      </div>
    </div>
  )
}
