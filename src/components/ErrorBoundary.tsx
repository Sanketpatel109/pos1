import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleFullReload = () => {
    window.location.reload();
  };

  private handleResetToDemo = () => {
    localStorage.setItem('monopos_is_demo', 'true');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-zinc-950 text-white flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white mb-2">
              POS Terminal Recovered
            </h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              A temporary runtime issue was caught safely to prevent data loss. You can reload the workstation or resume your register session below.
            </p>

            {this.state.error && (
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-6 text-left overflow-auto max-h-28">
                <p className="text-xs font-mono text-red-400 font-medium">
                  {this.state.error.message || 'Unknown error'}
                </p>
              </div>
            )}

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                Resume Station
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={this.handleFullReload}
                  className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleResetToDemo}
                  className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" />
                  Open Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
