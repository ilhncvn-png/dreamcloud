import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import OSStatusBar from './OSStatusBar';
import DreamAICore from './DreamAICore';
import { LiveSystemProvider } from '../contexts/LiveSystemContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <LiveSystemProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#060614' }}>
        {/* Ambient glow layers */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div style={{
            position: 'absolute',
            top: '-200px', left: '-100px',
            width: '800px', height: '800px',
            background: 'radial-gradient(circle, rgba(123,111,255,0.05) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-100px', right: '-100px',
            width: '600px', height: '600px',
            background: 'radial-gradient(circle, rgba(0,207,255,0.03) 0%, transparent 70%)',
          }} />
        </div>

        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ zIndex: 1, position: 'relative' }}>
          <OSStatusBar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Floating Dream AI Core */}
        <DreamAICore />
      </div>
    </LiveSystemProvider>
  );
}
