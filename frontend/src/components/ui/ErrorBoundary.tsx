import { Component, type ReactNode } from 'react';

interface Props   { children: ReactNode; }
interface State   { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm
                          border border-gray-100 max-w-md">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="heading-3 text-gray-800 mb-2">
              Something went wrong
            </h2>
            <p className="body-text-sm text-gray-500 mb-5">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="button-text bg-orange-500 text-white px-5 py-2 rounded-xl
                         hover:bg-orange-600 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}