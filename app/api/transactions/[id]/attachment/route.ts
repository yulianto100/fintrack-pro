import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase, getAdminStorageBucket } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

const MAX_SIZE = 6 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

interface StoredAttachmentFields {
  attachmentUrl?: string | null
  attachmentPath?: string | null
  attachmentType?: 'image' | 'pdf' | null
  attachmentSize?: number | null
  attachmentData?: string | null
  attachmentContentType?: string | null
  attachmentStorage?: 'firebase' | 'database' | null
  attachmentUpdatedAt?: number | null
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
    case 'application/pdf':
      return 'pdf'
    default:
      return 'jpg'
  }
}

function getAttachmentType(contentType: string): 'image' | 'pdf' {
  return contentType === 'application/pdf' ? 'pdf' : 'image'
}

function createDatabaseAttachmentUrl(txId: string, version: number) {
  return `/api/transactions/${txId}/attachment?v=${version}`
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const txId = params.id
  if (!txId) return NextResponse.json({ success: false, error: 'Transaction id required' }, { status: 400 })

  try {
    const db = getAdminDatabase()
    const txRef = db.ref(`users/${userId}/transactions/${txId}`)
    const txSnap = await txRef.get()
    if (!txSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const upload = formData.get('file')
    if (!isUploadFile(upload)) {
      return NextResponse.json({ success: false, error: 'File tidak valid' }, { status: 400 })
    }
    if (!ALLOWED.has(upload.type)) {
      return NextResponse.json({ success: false, error: 'Format harus JPG/PNG/WEBP/PDF' }, { status: 400 })
    }
    if (upload.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'Ukuran maksimal 6 MB' }, { status: 400 })
    }

    const tx = txSnap.val() as StoredAttachmentFields
    const previousPath = tx.attachmentPath || null
    const ext = getExtension(upload.type)
    const path = `users/${userId}/transactions/${txId}/receipt-${Date.now()}.${ext}`
    const downloadToken = randomUUID()
    const buffer = Buffer.from(await upload.arrayBuffer())
    const attachmentType = getAttachmentType(upload.type)

    try {
      const bucket = getAdminStorageBucket()
      const file = bucket.file(path)

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

      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`

      await txRef.update({
        attachmentUrl: url,
        attachmentPath: path,
        attachmentType,
        attachmentSize: upload.size,
        attachmentData: null,
        attachmentContentType: null,
        attachmentStorage: 'firebase',
        attachmentUpdatedAt: null,
        updatedAt: new Date().toISOString(),
      })

      if (
        previousPath &&
        previousPath !== path &&
        previousPath.startsWith(`users/${userId}/transactions/${txId}/`)
      ) {
        bucket.file(previousPath).delete({ ignoreNotFound: true }).catch((error) => {
          console.warn('[POST attachment] gagal menghapus struk lama', error)
        })
      }

      return NextResponse.json({ success: true, data: { url, path, type: attachmentType, size: upload.size } })
    } catch (storageError) {
      console.warn('[POST attachment] storage tidak tersedia, menyimpan struk di database', storageError)
    }

    const version = Date.now()
    const url = createDatabaseAttachmentUrl(txId, version)

    await txRef.update({
      attachmentUrl: url,
      attachmentPath: null,
      attachmentType,
      attachmentSize: upload.size,
      attachmentData: buffer.toString('base64'),
      attachmentContentType: upload.type,
      attachmentStorage: 'database',
      attachmentUpdatedAt: version,
      updatedAt: new Date().toISOString(),
    })

    if (previousPath && previousPath.startsWith(`users/${userId}/transactions/${txId}/`)) {
      try {
        const bucket = getAdminStorageBucket()
        await bucket.file(previousPath).delete({ ignoreNotFound: true })
      } catch {
        // Non-fatal when storage is unavailable.
      }
    }

    return NextResponse.json({ success: true, data: { url, path: null, type: attachmentType, size: upload.size } })
  } catch (err) {
    console.error('[POST /api/transactions/[id]/attachment]', err)
    return NextResponse.json({ success: false, error: 'Gagal upload struk' }, { status: 500 })
  }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const txSnap = await db.ref(`users/${userId}/transactions/${params.id}`).get()
    if (!txSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 })
    }

    const tx = txSnap.val() as StoredAttachmentFields
    const attachmentData = typeof tx.attachmentData === 'string' ? tx.attachmentData : null
    const contentType = typeof tx.attachmentContentType === 'string' ? tx.attachmentContentType : 'image/jpeg'

    if (!attachmentData) {
      return NextResponse.json({ success: false, error: 'Struk tidak ditemukan' }, { status: 404 })
    }

    return new NextResponse(Buffer.from(attachmentData, 'base64'), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    })
  } catch (err) {
    console.error('[GET attachment]', err)
    return NextResponse.json({ success: false, error: 'Gagal membuka struk' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const txRef = db.ref(`users/${userId}/transactions/${params.id}`)
    const txSnap = await txRef.get()
    if (!txSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 })
    }

    const tx = txSnap.val() as StoredAttachmentFields
    if (tx.attachmentPath && tx.attachmentPath.startsWith(`users/${userId}/transactions/${params.id}/`)) {
      try {
        const bucket = getAdminStorageBucket()
        await bucket.file(tx.attachmentPath).delete({ ignoreNotFound: true })
      } catch (e) {
        console.warn('[DELETE attachment] storage error', e)
      }
    }

    await txRef.update({
      attachmentUrl: null,
      attachmentPath: null,
      attachmentType: null,
      attachmentSize: null,
      attachmentData: null,
      attachmentContentType: null,
      attachmentStorage: null,
      attachmentUpdatedAt: null,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE attachment]', err)
    return NextResponse.json({ success: false, error: 'Gagal hapus struk' }, { status: 500 })
  }
}
