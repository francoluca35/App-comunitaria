import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import type { UserRow } from '../types.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET ?? ''
const JWT_EXPIRES = '7d'

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' })
      return
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, 'viewer', 'active')
       RETURNING id, email, name, role, status, created_at`,
      [email.trim().toLowerCase(), hashedPassword, name?.trim() ?? null]
    )
    const row = result.rows[0]
    const token = jwt.sign({ sub: row.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    res.status(201).json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status,
        created_at: row.created_at,
      },
      token,
    })
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e.code === '23505') {
      res.status(409).json({ error: 'Ya existe un usuario con ese email' })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'Error al registrar' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' })
      return
    }
    const result = await pool.query<UserRow>(
      'SELECT id, email, password, name, role, status, created_at FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    )
    const row = result.rows[0]
    if (!row || row.status === 'blocked') {
      res.status(401).json({ error: 'Credenciales inválidas o usuario bloqueado' })
      return
    }
    const valid = await bcrypt.compare(password, row.password)
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' })
      return
    }
    const token = jwt.sign({ sub: row.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
    res.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status,
        created_at: row.created_at,
      },
      token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

export default router
