export type UserRole = 'viewer' | 'admin'
export type UserStatus = 'active' | 'blocked'

export interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  status: UserStatus
  created_at: Date
}

export interface UserRow {
  id: string
  email: string
  password: string
  name: string | null
  role: string
  status: string
  created_at: Date
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}
