import { Skeleton } from "./Skeleton";

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col h-full space-y-2">
            {/* Header / Date - matches mt-6 from Dashboard */}
            <div className="text-center space-y-2 mt-6">
                {/* Hijri date - text-xl */}
                <Skeleton className="h-6 w-48 mx-auto" />
                {/* Gregorian date - text-xs */}
                <Skeleton className="h-3 w-32 mx-auto" />
            </div>

            {/* Main Countdown - matches py-1 flex-1 */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-1">
                {/* Timer - text-6xl (~60px line height) */}
                <Skeleton className="h-16 w-52" />
                {/* Label - text-xl */}
                <Skeleton className="h-5 w-36" />
                {/* Key date message (optional) */}
                <Skeleton className="h-3 w-40 mt-1" />
            </div>

            {/* Prayer List - 6 rows */}
            <div className="space-y-1">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/20"
                    >
                        {/* Audio toggle */}
                        <Skeleton className="h-7 w-7 rounded-full" variant="circular" />

                        {/* Name & Time */}
                        <div className="flex-1 px-3 flex items-center justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-14" />
                        </div>

                        {/* Checkbox */}
                        <Skeleton className="h-5 w-5 rounded-full" variant="circular" />
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-auto py-2 flex flex-col items-center gap-1 px-2">
                {/* Location */}
                <Skeleton className="h-3 w-36" />
                {/* Version */}
                <Skeleton className="h-2 w-16 mt-0.5" />
            </div>
        </div>
    );
}
