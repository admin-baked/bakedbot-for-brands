// src/app/(customer-menu)/layout.tsx
import { ReactNode } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

type CustomerMenuLayoutProps = {
    children: ReactNode;
};

export default function CustomerMenuLayout({ children }: CustomerMenuLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
