import { Skeleton } from "@/components/ui/skeleton"

export default function HomeSkeleton() {
    return (
        <div className="w-full bg-trad-bg-light pb-20">
            {/* Hero Skeleton (TraditionalHome structure) */}
            <div className="relative w-full h-[600px] lg:h-[800px] bg-trad-bg-warm flex flex-col items-center justify-center p-8 space-y-6">
                <Skeleton className="h-16 w-3/4 max-w-2xl bg-trad-border-warm/30" />
                <Skeleton className="h-4 w-1/2 max-w-lg bg-trad-border-warm/30" />
                <Skeleton className="h-10 w-40 mt-8 rounded-sm bg-trad-border-warm/30" />
            </div>

            {/* Chapter Nav Skeleton */}
            <div className="container mx-auto px-4 md:px-8 xl:px-20 -mt-8 relative z-10 flex gap-4 overflow-hidden">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-32 bg-white/90 shadow-sm" />
                ))}
            </div>

            {/* Chapter 1 Grid Skeleton */}
            <div className="container mx-auto px-4 md:px-8 xl:px-20 py-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                    {/* Left Content */}
                    <div className="lg:col-span-5 space-y-6">
                        <Skeleton className="h-4 w-24 bg-trad-border-warm" />
                        <Skeleton className="h-12 w-3/4 bg-trad-border-warm" />
                        <Skeleton className="h-40 w-full bg-trad-border-warm/50" />
                        <div className="flex gap-2 pt-4">
                            <Skeleton className="h-8 w-20 rounded-full bg-trad-border-warm" />
                            <Skeleton className="h-8 w-20 rounded-full bg-trad-border-warm" />
                        </div>
                    </div>

                    {/* Right Grid */}
                    <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="aspect-[4/5] w-full rounded-md bg-trad-border-warm/30" />
                                <Skeleton className="h-4 w-3/4 bg-trad-border-warm/30" />
                                <Skeleton className="h-4 w-1/2 bg-trad-border-warm/30" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
