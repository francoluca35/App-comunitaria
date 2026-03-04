# Backend – Comunidad

## Base de datos recomendada: **PostgreSQL**

- Relacional (usuarios, publicaciones, comentarios con FK).
- Transacciones para aprobar/rechazar y borrar en S3.
- Opciones: instalación local, [Supabase](https://supabase.com), [Neon](https://neon.tech), Railway.

## Setup

1. Crear base de datos PostgreSQL (ej. `comunidad`).
2. Copiar `.env.example` a `.env` y completar:
   - `DATABASE_URL=postgresql://usuario:password@localhost:5432/comunidad`
   - `JWT_SECRET=` (string largo y aleatorio)
3. Instalar y ejecutar:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Crear admin inicial

Por defecto el seed crea:

- Email: `admin@comunidad.com`
- Password: `Admin123!`

Para otro usuario/contraseña:

```bash
ADMIN_EMAIL=otro@admin.com ADMIN_PASSWORD=OtraClave123! npm run db:seed
```

También podés insertar un admin a mano en la tabla `users` con `role = 'admin'` y `password` hasheado con bcrypt.

## Endpoints

- `POST /api/auth/register` – Registro (role = viewer por defecto).
- `POST /api/auth/login` – Login (devuelve `user` + `token`).
- `GET /api/me` – Usuario actual (header `Authorization: Bearer <token>`).
- `GET /api/admin/dashboard` – Solo admin (mismo header).

## Middleware

- **isAuthenticated**: exige token JWT válido y usuario activo.
- **isAdmin**: exige que `req.user.role === 'admin'`.
