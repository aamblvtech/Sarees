import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * VESTRA React Error Boundary
 * Uses approved palette: #FCF8F8 / #0F172A / #F9DFDF / #F5AFAF / #FBEFEF / #000000 / #FFFFFF
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
        <div className="min-h-screen bg-[#FCF8F8] dark:bg-[#0F172A] text-[#000000] dark:text-[#FFFFFF] flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-[#FBEFEF] dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 p-8 sm:p-10 shadow-vestra space-y-6 text-center animate-fadeIn">
            
            <div className="w-14 h-14 bg-white dark:bg-slate-800 border border-[#F9DFDF] dark:border-slate-700 rounded-full mx-auto flex items-center justify-center text-slate-800 dark:text-slate-200">
              <AlertCircle className="w-7 h-7 text-[#F5AFAF]" />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.25em] uppercase font-mono text-slate-500 dark:text-slate-400">
                Studio Diagnostic Notice
              </p>
              <h2 className="font-serif text-2xl text-[#000000] dark:text-[#FFFFFF] font-normal">
                Virtual Try-On Interruption
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                The virtual try-on studio encountered an unexpected condition. Your session state and images have been preserved.
              </p>
            </div>

            {/* Error Details */}
            {this.state.error && (
              <div className="p-4 bg-white dark:bg-slate-900 border border-[#F9DFDF] dark:border-slate-800 text-left font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                <p className="font-bold text-[#000000] dark:text-[#FFFFFF] mb-1">Diagnostic Details:</p>
                <p className="text-rose-600 dark:text-rose-400">{this.state.error.toString()}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#000000] hover:bg-slate-900 text-[#FFFFFF] dark:bg-[#FFFFFF] dark:hover:bg-slate-100 dark:text-[#000000] text-xs uppercase tracking-widest font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Fitting Room</span>
              </button>
              <a
                href="/catalogue"
                className="w-full sm:w-auto px-6 py-2.5 border border-[#F9DFDF] dark:border-slate-700 text-[#000000] dark:text-[#FFFFFF] hover:bg-white dark:hover:bg-slate-800 text-xs uppercase tracking-widest font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Browse Catalogue</span>
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
