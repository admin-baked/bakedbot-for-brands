
import { cn } from "@/lib/utils";
import Image from "next/image";

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
        sm: "h-8 w-8",
        md: "h-12 w-12",
        lg: "h-16 w-16",
        xl: "h-24 w-24",
    };

    return (
        <div
            className={cn("flex flex-col items-center justify-center gap-2", className)}
            {...props}
            role="status"
        >
            <Image
                src="https://storage.cloud.google.com/bakedbot-global-assets/Untitled%20design.png"
                alt="Loading"
                width={96}
                height={96}
                className={cn("animate-spin", sizeClasses[size])}
                priority
                unoptimized
            />
            {label && <span className="text-sm text-muted-foreground">{label}</span>}
            <span className="sr-only">Loading...</span>
        </div>
    );
}
