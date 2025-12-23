
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg" | "xl";
    label?: string; // Optional label for accessibility or visual text
    variant?: "default" | "static"; // default = animated GIF, static = PNG
}

export function Spinner({
    className,
    size = "md",
    label,
    variant = "default",
    ...props
}: SpinnerProps) {
    const sizeClasses = {
        sm: "h-8 w-8",
        md: "h-12 w-12",
        lg: "h-16 w-16",
        xl: "h-24 w-24",
    };

    // Use animated GIF by default, static PNG as fallback
    const imageUrl = variant === "static"
        ? "https://storage.googleapis.com/bakedbot-global-assets/Untitled%20design.png"
        : "https://storage.googleapis.com/bakedbot-global-assets/smokey%20animated%20spinner.gif";

    return (
        <div
            className={cn("flex flex-col items-center justify-center gap-2", className)}
            {...props}
            role="status"
        >
            <Image
                src={imageUrl}
                alt="Loading"
                width={96}
                height={96}
                className={cn(sizeClasses[size])}
                priority
                unoptimized
            />
            {label && <span className="text-sm text-muted-foreground">{label}</span>}
            <span className="sr-only">Loading...</span>
        </div>
    );
}
