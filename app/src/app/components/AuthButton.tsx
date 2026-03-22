import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function AuthButton() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Profile'

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 50
    }}>
      {user ? (
        <Link href="/profile" className="glass-card-heavy" style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'white',
          textDecoration: 'none',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-glow)' }} />
          {displayName}
        </Link>
      ) : (
        <Link href="/login" className="glass-card-heavy" style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.2s ease'
        }}>
          Login
        </Link>
      )}
    </div>
  )
}
