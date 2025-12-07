
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg" | "xl";
    label?: string; // Optional label for accessibility or visual text
}

export function Spinner({
    className,
    size = "md",
    label,
    ...props
}: SpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
    };

    return (
        <div
            className={cn("flex flex-col items-center justify-center gap-2", className)}
            {...props}
            role="status"
        >
            <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
            {label && <span className="text-sm text-muted-foreground">{label}</span>}
            <span className="sr-only">Loading...</span>
        </div>
    );
}
