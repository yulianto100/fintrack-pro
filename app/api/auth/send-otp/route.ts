import { NextResponse } from 'next/server'

// Fitur OTP email telah dinonaktifkan.
// File ini hanya placeholder agar build tidak gagal.
export async function POST() {
  return NextResponse.json({ success: false, error: 'Fitur ini tidak tersedia' }, { status: 410 })
}