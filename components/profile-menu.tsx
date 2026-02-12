"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { logout, getUser } from '@/utils/auth'

export default function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    try { setUser(getUser()) } catch (e) {}
  }, [])

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 p-1 rounded-md hover:bg-white/10 text-white"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {user && user.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.profilePicture} alt={user.username || 'User'} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-[#29a8e0] text-white flex items-center justify-center font-semibold">{user && user.username ? String(user.username).charAt(0).toUpperCase() : 'A'}</div>
        )}
        <span className="hidden sm:inline text-sm">{user?.username || 'Admin'}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white text-slate-900 rounded-md shadow-lg py-1 z-20">
          <a href="/profile" className="block px-4 py-2 text-sm hover:bg-slate-100">Profile</a>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100">Logout</button>
        </div>
      )}
    </div>
  )
}
