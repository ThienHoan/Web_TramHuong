import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function CheckoutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="atelier-page atelier-checkout">{children}</div>;
}
