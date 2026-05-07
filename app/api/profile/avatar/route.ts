import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase, getAdminStorageBucket } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'type' in value &&
    'size' in value
  )
}

function getExtension(contentType: string) {
  switch (contentType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const upload = formData.get('avatar')

    if (!isUploadFile(upload)) {
      return NextResponse.json({ success: false, error: 'Foto profil tidak valid' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_TYPES.has(upload.type)) {
      return NextResponse.json({ success: false, error: 'Format foto harus JPG, PNG, WEBP, atau GIF' }, { status: 400 })
    }

    if (upload.size > MAX_AVATAR_SIZE) {
      return NextResponse.json({ success: false, error: 'Ukuran foto maksimal 5MB' }, { status: 400 })
    }

    const db = getAdminDatabase()
    const bucket = getAdminStorageBucket()
    const profileRef = db.ref(`users/${userId}/profile`)
    const profileSnap = await profileRef.get()
    const profile = profileSnap.exists() ? profileSnap.val() : {}
    const previousAvatarPath = typeof profile?.avatarPath === 'string' ? profile.avatarPath : null

    const extension = getExtension(upload.type)
    const avatarPath = `users/${userId}/profile/avatar-${Date.now()}.${extension}`
    const downloadToken = randomUUID()
    const buffer = Buffer.from(await upload.arrayBuffer())
    const file = bucket.file(avatarPath)

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: upload.type,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    })

    const image = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(avatarPath)}?alt=media&token=${downloadToken}`

    await profileRef.update({
      image,
      avatarPath,
      updatedAt: new Date().toISOString(),
    })

    if (
      previousAvatarPath &&
      previousAvatarPath !== avatarPath &&
      previousAvatarPath.startsWith(`users/${userId}/profile/`)
    ) {
      bucket.file(previousAvatarPath).delete({ ignoreNotFound: true }).catch((error) => {
        console.warn('[POST /api/profile/avatar] failed to delete old avatar', error)
      })
    }

    return NextResponse.json({ success: true, data: { image } })
  } catch (err) {
    console.error('[POST /api/profile/avatar]', err)
    return NextResponse.json({ success: false, error: 'Gagal menyimpan foto profil' }, { status: 500 })
  }
}
