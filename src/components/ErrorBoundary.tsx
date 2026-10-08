import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

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
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isMongoErr = this.state.error?.message?.includes('[MONGODB]') || this.state.error?.message?.includes('Database not connected');

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Application Notice</h1>
                <p className="text-xs text-slate-400">
                  {isMongoErr ? 'Database Connection Required' : 'An unexpected error occurred'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 break-words">
              {this.state.error?.message || 'Unknown error'}
            </div>

            {isMongoErr && (
              <p className="text-xs text-amber-300/90 leading-relaxed">
                The application is waiting for a valid MongoDB connection to cluster <strong>medirebal-cluster.zymwfdv.mongodb.net</strong>. If your MONGODB_URI has &ldquo;&lt;db_password&gt;&rdquo;, please configure your database user password in Atlas.
              </p>
            )}

            <div className="pt-2 flex gap-3">
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
