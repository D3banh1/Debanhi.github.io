import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Fieldnotes · Your research workspace', description: 'Bring your literature, projects, and next steps into one thoughtful research workspace.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body>{children}</body></html>; }
