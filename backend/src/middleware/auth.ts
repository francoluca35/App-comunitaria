import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import type { User, UserRow } from '../types.js'

const JWT_SECRET = process.env.JWT_SECRET ?? ''

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as User['role'],
    status: row.status as User['status'],
    created_at: row.created_at,
  }
}

export async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'No autorizado: token faltante' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string }
    const result = await pool.query<UserRow>(
      'SELECT id, email, password, name, role, status, created_at FROM users WHERE id = $1',
      [decoded.sub]
    )
    const row = result.rows[0]
    if (!row) {
      res.status(401).json({ error: 'Usuario no encontrado' })
      return
    }
    if (row.status === 'blocked') {
      res.status(403).json({ error: 'Usuario bloqueado' })
      return
    }
    req.user = rowToUser(row)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function isAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Se requiere rol admin' })
    return
  }
  next()
}
