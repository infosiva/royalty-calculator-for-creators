import { ErrorBoundary } from 'react-error-boundary';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<div>Error: An unexpected error occurred.</div>}
      onError={(error) => console.error(error)}
    >
      <html
        lang="en"
        className="h-full"
        style={
          {
            '--theme-primary':   colors.primary,
            '--theme-secondary': colors.secondary,
            '--theme-base':      colors.base,
            '--scrollbar-color': getScrollbarColor(config.themeColor),
          } as React.CSSProperties
        }
      >
        <body className={' ${inter.className} min-h-full flex flex-col text-white'}
          style={{ background: colors.base }}
        >
          <div style={meshStyle} />

          <Navbar />

          <main className="flex-1">
            {children}
          </main>

          <footer className="border-t border-white/[0.06] py-8 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white/40 text-sm">
              <span> {new Date().getFullYear()} {config.name}. All rights reserved.</span>
              <div className="flex gap-6">
                <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy</a>
                <a href="/terms"   className="hover:text-white/70 transition-colors">Terms</a>
                <a href="/contact" className="hover:text-white/70 transition-colors">Contact</a>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ErrorBoundary>
  );
}