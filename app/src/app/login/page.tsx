import { login, signup } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '2rem'
    }}>
      <div className="glass-card-heavy" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
        <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>TCG Login</h1>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
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
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button formAction={login} className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>Login</button>
            <button formAction={signup} className="btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>Sign Up</button>
          </div>

          {message && (
            <p style={{ marginTop: '1rem', color: 'var(--accent-red)', textAlign: 'center', fontSize: '0.875rem' }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
