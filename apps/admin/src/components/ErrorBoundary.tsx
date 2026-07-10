import { Component, type ReactNode } from 'react';

interface Props  { children: ReactNode }
interface State  { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#060614', color: '#E8E8FF', fontFamily: 'JetBrains Mono, monospace',
        padding: 32,
      }}>
        <div style={{
          maxWidth: 560, background: 'rgba(255,74,94,0.06)',
          border: '1px solid rgba(255,74,94,0.25)', borderRadius: 16, padding: 32,
        }}>
          <p style={{ color: '#FF4A5E', fontSize: 10, letterSpacing: '0.15em', marginBottom: 12 }}>
            RUNTIME ERROR — COMPONENT BOUNDARY CAUGHT
          </p>
          <p style={{ color: '#E8E8FF', fontWeight: 700, marginBottom: 8 }}>
            {error.name}: {error.message}
          </p>
          <pre style={{
            color: 'rgba(232,232,255,0.4)', fontSize: 11, overflowX: 'auto',
            whiteSpace: 'pre-wrap', marginBottom: 20,
          }}>
            {error.stack?.split('\n').slice(0, 6).join('\n')}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              background: 'rgba(255,74,94,0.15)', border: '1px solid rgba(255,74,94,0.4)',
              color: '#FF4A5E', padding: '8px 20px', borderRadius: 8,
              fontFamily: 'inherit', fontSize: 11, cursor: 'pointer',
            }}
          >
            ↺ RELOAD
          </button>
        </div>
      </div>
    );
  }
}

/* Per-page wrapper — shows inline error, doesn't kill the layout */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{
        margin: 24, padding: 24, borderRadius: 12,
        background: 'rgba(255,74,94,0.06)', border: '1px solid rgba(255,74,94,0.2)',
      }}>
        <p style={{ color: '#FF4A5E', fontSize: 10, letterSpacing: '0.12em', marginBottom: 8, fontFamily: 'monospace' }}>
          PAGE COMPONENT ERROR
        </p>
        <p style={{ color: '#E8E8FF', fontSize: 13, marginBottom: 12 }}>{error.message}</p>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.3)',
            color: '#7B6FFF', padding: '6px 16px', borderRadius: 6,
            fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
          }}
        >↺ Retry</button>
      </div>
    );
  }
}
