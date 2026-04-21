declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }

  const webpush: {
    setVapidDetails: (mail: string, publicKey: string, privateKey: string) => void
    sendNotification: (sub: PushSubscription, payload: string) => Promise<any>
  }

  export default webpush
}