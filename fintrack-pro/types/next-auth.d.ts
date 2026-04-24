import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id:                string
      name?:             string | null
      email?:            string | null
      image?:            string | null
      profileCompleted?: boolean
      provider?:         string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?:              string
    sub?:              string
    provider?:         string
    profileCompleted?: boolean
  }
}
