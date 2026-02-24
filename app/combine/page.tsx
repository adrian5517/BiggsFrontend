"use client";

import React from "react";
import CombineClient from "@/components/combine-client";

export default function CombinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Combine & Merge</h1>
          <p className="text-lg text-slate-600">
            Merge multiple CSV files from a directory into a single master dataset
          </p>
        </div>

        <CombineClient /> 
      </div>
    </div>
  );
}
