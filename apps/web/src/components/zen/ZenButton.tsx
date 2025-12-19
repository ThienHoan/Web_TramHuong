
interface ZenButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export default function ZenButton({ children, className, ...props }: ZenButtonProps) {
    return (
        <button
            className={`px-8 py-3 bg-zen-50 border border-zen-800 text-zen-900 
      hover:bg-zen-800 hover:text-zen-50 transition-all duration-500 ease-out 
      uppercase tracking-[0.2em] text-xs font-light ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
