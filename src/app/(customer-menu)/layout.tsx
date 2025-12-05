// src/app/(customer-menu)/layout.tsx
import { ReactNode } from 'react';


type CustomerMenuLayoutProps = {
    children: ReactNode;
};

export default function CustomerMenuLayout({ children }: CustomerMenuLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
        </div>
    );
}
