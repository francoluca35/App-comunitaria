import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './pool.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@comunidad.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!'

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
    await pool.query(
      `INSERT INTO users (email, password, name, role, status)
       VALUES ($1, $2, $3, 'admin', 'active')
       ON CONFLICT (email) DO UPDATE SET password = $2, role = 'admin', status = 'active'`,
      [ADMIN_EMAIL, hashedPassword, 'Admin']
    )
    console.log('✅ Admin creado/actualizado:', ADMIN_EMAIL)
  } catch (err) {
    console.error('❌ Error en seed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
