'use client';
import { useCookieStore } from "@/lib/cookie-storage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TiledLayout({ children }: { children: React.ReactNode }) {
    const { menuStyle } = useCookieStore();
    const router = useRouter();

    useEffect(() => {
        if (menuStyle === 'default') {
            router.replace('/menu/(default)');
        }
    }, [menuStyle, router]);
    
    if (menuStyle === 'default') {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}
