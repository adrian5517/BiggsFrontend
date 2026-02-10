'use client'

export default function GeometricDecorations() {
  return (
    <>
      {/* Top Right Squares */}
      <div className="absolute right-4 top-8 space-y-3 sm:right-8 sm:top-12">
        <div className="flex gap-3">
          <div className="h-10 w-10 bg-secondary sm:h-12 sm:w-12" />
          <div className="h-10 w-10 bg-secondary sm:h-12 sm:w-12" />
          <div className="h-10 w-10 bg-secondary sm:h-12 sm:w-12" />
        </div>
        <div className="flex gap-3 pl-6">
          <div className="h-10 w-10 bg-secondary sm:h-12 sm:w-12" />
          <div className="h-10 w-10 bg-secondary sm:h-12 sm:w-12" />
        </div>
      </div>

      {/* Right Side Mixed Squares */}
      <div className="absolute bottom-40 right-4 space-y-2 sm:right-8">
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-secondary sm:h-10 sm:w-10" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-accent sm:h-10 sm:w-10" />
          <div className="h-8 w-8 bg-red-500 sm:h-10 sm:w-10" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-red-500 sm:h-10 sm:w-10" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-secondary sm:h-10 sm:w-10" />
          <div className="h-8 w-8 bg-accent sm:h-10 sm:w-10" />
        </div>
      </div>

      {/* Left Side Squares */}
      <div className="absolute bottom-32 left-4 space-y-2 sm:left-8">
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-secondary sm:h-10 sm:w-10" />
          <div className="h-8 w-8 bg-secondary sm:h-10 sm:w-10" />
          <div className="h-8 w-8 bg-secondary sm:h-10 sm:w-10" />
        </div>
        <div className="flex gap-2 pl-4">
          <div className="h-8 w-8 bg-secondary sm:h-10 sm:w-10" />
          <div className="h-8 w-8 bg-secondary sm:h-10 sm:w-10" />
        </div>
      </div>

      {/* Bottom Right Large Circles */}
      <div className="absolute -bottom-20 -right-5 h-64 w-64 rounded-full bg-accent " />
      <div className="absolute -bottom-5 -right-12 h-48 w-48 rounded-full bg-secondary " />
      
      <div className="absolute -bottom-8 right-12 h-40 w-40 rounded-full bg-red-500" />
    </>
  )
}
