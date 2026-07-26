import { Component, type ErrorInfo, type ReactNode } from "react";
import { authService } from "../services/authService";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Plasa de siguranță a aplicației: fără ea, orice excepție în render demontează
// tot arborele React și lasă o pagină albă, fără nici măcar un buton de logout.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Eroare neprevăzută în interfață:", error, info);
  }

  private handleReset = () => {
    authService.logout();
    window.location.href = "/login";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-xl">
          <h1 className="mb-2 text-lg font-bold text-ink">Ceva n-a mers bine</h1>
          <p className="mb-4 text-sm text-ink-secondary">
            Interfața a întâmpinat o eroare neașteptată. Reîncarcă pagina, iar dacă problema
            persistă, deconectează-te și autentifică-te din nou.
          </p>
          <p className="mb-5 break-words rounded-md bg-surface-alt px-3 py-2 text-left text-xs text-ink-muted">
            {this.state.error.message}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt"
            >
              Reîncarcă
            </button>
            <button
              onClick={this.handleReset}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Deconectează-te
            </button>
          </div>
        </div>
      </div>
    );
  }
}
