export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-trad-bg-light">
            <div className="relative">
                {/* Outer rotating ring */}
                <div className="w-16 h-16 border-4 border-trad-border-warm rounded-full border-t-trad-primary animate-spin"></div>
                {/* Inner pulsing logo/dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-trad-primary rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}
