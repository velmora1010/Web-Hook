import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          padding: '40px', 
          textAlign: 'center', 
          backgroundColor: '#0b0d12',
          color: '#f0f2f5',
          fontFamily: "'Outfit', sans-serif"
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Application Error</h2>
          <p style={{ maxWidth: '600px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {this.state.error?.message || 'An unknown error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
