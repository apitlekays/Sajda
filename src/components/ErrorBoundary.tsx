import { ReactNode, useState } from 'react';
import { PostHogErrorBoundary, PostHogErrorBoundaryFallbackProps } from '@posthog/react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

export function ErrorBoundary({ children }: Props) {
    const [key, setKey] = useState(0);

    return (
        <PostHogErrorBoundary
            key={key}
            fallback={(props) => (
                <ErrorFallbackWithReset
                    {...props}
                    onReset={() => setKey(k => k + 1)}
                />
            )}
        >
            {children}
        </PostHogErrorBoundary>
    );
}

interface ErrorFallbackWithResetProps extends PostHogErrorBoundaryFallbackProps {
    onReset: () => void;
}

function ErrorFallbackWithReset({ error, onReset }: ErrorFallbackWithResetProps) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
            <h1 className="text-xl font-bold mb-2 text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                {errorMessage}
            </p>
            <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
                <RotateCcw className="w-4 h-4" />
                Try Again
            </button>
        </div>
    );
}
