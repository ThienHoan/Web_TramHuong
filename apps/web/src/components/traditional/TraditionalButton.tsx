
interface TraditionalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export default function TraditionalButton({ children, className, ...props }: TraditionalButtonProps) {
    return (
        <button
            className={`px-6 py-3 bg-trad-red-900 text-trad-amber-100 
      border-2 border-trad-amber-700 
      hover:bg-trad-red-950 hover:border-trad-amber-600 shadow-md 
      font-serif font-bold text-lg tracking-wide rounded-sm ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
