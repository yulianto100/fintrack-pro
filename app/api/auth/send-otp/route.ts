import { NextResponse } from 'next/server'
import { getAdminDatabase } from '@/lib/firebase-admin'
import nodemailer from 'nodemailer'

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendOtpEmail(to: string, otp: string, username: string) {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: `"FinTrack Pro" <${process.env.SMTP_USER}>`,
    to,
    subject: `${otp} — Kode OTP FinTrack Pro`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;background:#0a1510;color:#e8faf0;padding:32px;border-radius:16px;border:1px solid rgba(34,197,94,0.2)">
        <h2 style="color:#22c55e;margin-bottom:8px">FinTrack Pro</h2>
        <p style="color:#7dd3a8;margin-bottom:24px">Halo <strong>${username}</strong>!</p>
        <p style="margin-bottom:16px">Kode OTP login dari perangkat baru Anda:</p>
        <div style="background:#1a2e20;border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <p style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#22c55e;margin:0">${otp}</p>
        </div>
        <p style="color:#4d7a62;font-size:13px">Kode berlaku <strong>10 menit</strong>. Jangan bagikan ke siapapun.</p>
        <p style="color:#4d7a62;font-size:12px;margin-top:16px">Jika bukan Anda, abaikan email ini.</p>
      </div>
    `,
  })
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email wajib diisi' }, { status: 400 })

    const db   = getAdminDatabase()
    const norm = email.toLowerCase().trim()

    // Find user
    const snap = await db.ref('users').orderByChild('profile/email').equalTo(norm).get()
    if (!snap.exists())
      return NextResponse.json({ success: false, error: 'Email tidak ditemukan' }, { status: 404 })

    const [uid, userData] = Object.entries(snap.val())[0] as [string, Record<string, unknown>]
    const auth = userData.auth as { username?: string } | undefined
    const username = auth?.username || norm

    const otp       = makeOtp()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 min

    // Save OTP to Firebase
    await db.ref(`users/${uid}/otp`).set({ code: otp, expiresAt })

    // Send email
    await sendOtpEmail(norm, otp, username)

    return NextResponse.json({ success: true, message: 'OTP telah dikirim ke email Anda' })
  } catch (err) {
    console.error('[send-otp]', err)
    return NextResponse.json({ success: false, error: 'Gagal mengirim OTP' }, { status: 500 })
  }
}
