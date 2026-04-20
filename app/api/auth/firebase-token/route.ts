import { NextResponse } from 'next/server'

// Firebase custom token tidak digunakan lagi.
// Auth sekarang ditangani sepenuhnya oleh NextAuth.
export async function GET() {
  return NextResponse.json({ error: 'Not used' }, { status: 410 })
}