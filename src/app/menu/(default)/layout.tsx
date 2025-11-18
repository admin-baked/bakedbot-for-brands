
'use client';
import { useCookieStore } from "@/lib/cookie-storage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
    const { menuStyle } = useCookieStore();
    const router = useRouter();

    useEffect(() => {
        if (menuStyle === 'alt') {
            router.replace('/menu/tiled');
        }
    }, [menuStyle, router]);

    if (menuStyle === 'alt') {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}
