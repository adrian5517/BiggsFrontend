'use client'

export default function GeometricDecorations() {
  return (
    <>
      {/* Top-right sky-blue pixel blocks */}
      <div className="absolute right-8 top-8 hidden sm:block" aria-hidden="true">
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
        </div>
        <div className="mt-2 flex gap-2 pl-6">
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
        </div>
        <div className="mt-2 flex gap-2 pl-12">
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-10 w-10 bg-[hsl(var(--biggs-blue))]" />
        </div>
      </div>

      {/* Right-middle mixed pixel blocks */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:block" aria-hidden="true">
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-[hsl(var(--biggs-blue))]" />
        </div>
        <div className="mt-2 flex gap-2">
          <div className="h-8 w-8 bg-[hsl(var(--biggs-gold))]" />
          <div className="h-8 w-8 bg-[hsl(var(--biggs-red))]" />
        </div>
        <div className="mt-2 flex gap-2 pl-4">
          <div className="h-8 w-8 bg-[hsl(var(--biggs-red))]" />
        </div>
        <div className="mt-2 flex gap-2">
          <div className="h-8 w-8 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-8 w-8 bg-[hsl(var(--biggs-gold))]" />
        </div>
      </div>

      {/* Bottom-left sky-blue pixel blocks */}
      <div className="absolute bottom-32 left-6 hidden sm:block" aria-hidden="true">
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-9 w-9 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-9 w-9 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-9 w-9 bg-[hsl(var(--biggs-blue))]" />
        </div>
        <div className="mt-2 flex gap-2 pl-5">
          <div className="h-9 w-9 bg-[hsl(var(--biggs-blue))]" />
          <div className="h-9 w-9 bg-[hsl(var(--biggs-blue))]" />
        </div>
      </div>

      {/* Bottom-right overlapping circles */}
      <div className="absolute -bottom-16 -right-8" aria-hidden="true">
        <div className="relative h-56 w-56 sm:h-72 sm:w-72">
          <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-[hsl(var(--biggs-gold))] sm:h-56 sm:w-56" />
          <div className="absolute bottom-4 right-0 h-36 w-36 rounded-full bg-[hsl(var(--biggs-blue))] sm:h-44 sm:w-44" />
          <div className="absolute bottom-8 right-8 h-28 w-28 rounded-full bg-[hsl(var(--biggs-red))] sm:h-36 sm:w-36" />
        </div>
      </div>
    </>
  )
}
