import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * VESTRA React Error Boundary
 * Uses Atelier aesthetic: neutral ramp (#0D0E10 / #121316), subtle hairline borders, Playfair Display typography.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[VESTRA ErrorBoundary Caught Error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0D0E10] text-neutral-900 dark:text-neutral-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] p-8 sm:p-10 shadow-xs space-y-6 text-center">
            
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 border border-black/[0.06] dark:border-white/[0.08] rounded-full mx-auto flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <AlertCircle className="w-6 h-6 text-[#A84B55] dark:text-[#C96872]" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                Studio diagnostic notice
              </p>
              <h2 className="font-serif text-2xl text-neutral-900 dark:text-neutral-50 font-normal">
                Virtual Try-On Interruption
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
                The virtual try-on studio encountered an unexpected condition. Your session state and images have been preserved.
              </p>
            </div>

            {/* Error Details */}
            {this.state.error && (
              <div className="p-4 bg-neutral-50 dark:bg-[#17181C] border border-black/[0.06] dark:border-white/[0.06] text-left font-mono text-xs text-neutral-700 dark:text-neutral-300 overflow-x-auto rounded-xs">
                <p className="font-medium text-neutral-900 dark:text-neutral-200 mb-1">Diagnostic details:</p>
                <p className="text-red-600 dark:text-red-400">{this.state.error.toString()}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 text-xs font-medium tracking-wide flex items-center justify-center space-x-2 transition-colors rounded-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload fitting room</span>
              </button>
              <a
                href="/catalogue"
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 border border-black/[0.1] dark:border-white/[0.1] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-[#17181C] text-xs font-medium tracking-wide flex items-center justify-center space-x-2 transition-colors rounded-xs"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Browse catalogue</span>
              </a>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
