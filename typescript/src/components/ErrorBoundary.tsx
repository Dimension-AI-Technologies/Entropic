import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          color: 'white',
          background: '#1a1d21',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif',
          padding: '20px'
        }}>
          <h1 style={{ color: '#ff6b6b' }}>Something went wrong.</h1>
          <p>An unexpected error occurred in the application.</p>
          {this.state.error && (
            <pre style={{
              background: '#2a2d31',
              border: '1px solid #3f4448',
              borderRadius: '4px',
              padding: '10px',
              maxWidth: '80%',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: '#e1e1e1',
              marginTop: '20px'
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <button onClick={this.handleReload} style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#4f545c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
