import React, { Component, ReactNode } from 'react';
import { DOMErrorScreen } from './DOMErrorScreen';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class DOMErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging purposes
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Store error info for potential reporting
    this.setState({
      error,
      errorInfo
    });

    // Optional: Send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Force a full page reload to ensure clean state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error screen
      return (
        <DOMErrorScreen 
          onReload={this.handleReload}
          errorMessage="A rendering error occurred. The app will reload to restore functionality."
        />
      );
    }

    return this.props.children;
  }
}