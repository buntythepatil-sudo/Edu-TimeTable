import React from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  declare state: ErrorBoundaryState;
  declare setState: (
    state: Partial<ErrorBoundaryState> | ((prevState: ErrorBoundaryState) => Partial<ErrorBoundaryState>)
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isPermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected application error occurred.';
    let isPerm = false;

    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed.error === 'string') {
        isPerm = parsed.error.toLowerCase().includes('permission') || parsed.error.toLowerCase().includes('insufficient');
        message = isPerm
          ? `Firestore permission denied on "${parsed.path || 'database'}". Your account may lack access or be blocked.`
          : parsed.error;
      }
    } catch {
      isPerm = message.toLowerCase().includes('permission') || message.toLowerCase().includes('insufficient');
    }

    return {
      hasError: true,
      errorMessage: message,
      isPermissionError: isPerm,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught application error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '', isPermissionError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
              {this.state.isPermissionError ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <h1 className="text-lg font-black text-slate-900">
              {this.state.isPermissionError ? 'Access Restricted' : 'Something went wrong'}
            </h1>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {this.state.errorMessage}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
