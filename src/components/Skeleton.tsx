import { cn } from "../lib/utils";

interface SkeletonProps {
    className?: string;
    variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ className, variant = "rectangular" }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse bg-muted",
                variant === "circular" && "rounded-full",
                variant === "text" && "rounded h-4",
                variant === "rectangular" && "rounded",
                className
            )}
        />
    );
}
