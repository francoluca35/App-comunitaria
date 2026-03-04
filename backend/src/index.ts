import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import { isAuthenticated, isAdmin } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)

app.get('/api/me', isAuthenticated, (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/admin/dashboard', isAuthenticated, isAdmin, (req, res) => {
  res.json({ message: 'Solo admin puede ver esto' })
})

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`)
})
