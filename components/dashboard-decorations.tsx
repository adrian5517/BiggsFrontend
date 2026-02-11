'use client'

export function DashboardDecorations() {
  return (
    <>
      {/* Top-right pixel blocks */}
      <div className="pointer-events-none fixed right-4 top-24 hidden opacity-20 lg:block" aria-hidden="true">
        <div className="flex gap-1.5">
          <div className="h-6 w-6 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-6 w-6 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-6 w-6 bg-[hsl(var(--biggs-blue))]" />
        </div>
        <div className="mt-1.5 flex gap-1.5 pl-4">
          <div className="h-6 w-6 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-6 w-6 bg-[hsl(var(--biggs-blue))]" />
        </div>
      </div>

      {/* Bottom-left pixel blocks */}
      <div className="pointer-events-none fixed bottom-16 left-4 hidden opacity-15 lg:block" aria-hidden="true">
        <div className="flex gap-1.5">
          <div className="h-5 w-5 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-5 w-5 bg-[hsl(var(--biggs-blue))]" />
        </div>
        <div className="mt-1.5 flex gap-1.5 pl-3">
          <div className="h-5 w-5 bg-[hsl(var(--biggs-blue))]" />
        </div>
      </div>
    </>
  )
}
