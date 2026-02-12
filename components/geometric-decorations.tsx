'use client'

export default function GeometricDecorations() {
  return (
    <>
      {/* Decorative overlay — subtle, brand-aligned, behind content */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute right-6 top-8 flex items-center gap-3 opacity-90 transform -rotate-6">
          <div className="h-12 w-12 bg-[#29a8e0] rounded-md shadow-lg" />
          <div className="h-12 w-12 bg-[#ecbc32] rounded-md shadow-lg" />
          <div className="h-12 w-12 bg-[#bd202e] rounded-md shadow-lg" />
        </div>

        <div className="absolute bottom-36 right-6 flex flex-col gap-3 opacity-80">
          <div className="h-10 w-10 bg-[#29a8e0] rounded-sm" />
          <div className="h-10 w-10 bg-[#ecbc32] rounded-sm" />
          <div className="h-10 w-10 bg-[#bd202e] rounded-sm" />
        </div>

        <div className="absolute bottom-28 left-6 flex gap-3 opacity-70">
          <div className="h-10 w-10 bg-[#ecbc32] rounded-sm" />
          <div className="h-10 w-10 bg-[#bd202e] rounded-sm" />
          <div className="h-10 w-10 bg-[#29a8e0] rounded-sm" />
        </div>

        <div className="absolute -bottom-16 -right-8 h-72 w-72 rounded-full bg-[#ecbc32] opacity-20 blur-2xl" />
        <div className="absolute -bottom-8 -right-20 h-56 w-56 rounded-full bg-[#29a8e0] opacity-18 blur-2xl" />
        <div className="absolute -bottom-12 right-16 h-48 w-48 rounded-full bg-[#bd202e] opacity-16 blur-2xl" />
      </div>
    </>
  )
}
