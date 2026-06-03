import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="w-full min-h-screen px-4 py-6 md:px-8 lg:px-12 xl:max-w-7xl xl:mx-auto">
      {title && <h1 className="text-2xl font-black uppercase mb-6">{title}</h1>}
      {children}
    </div>
  );
}