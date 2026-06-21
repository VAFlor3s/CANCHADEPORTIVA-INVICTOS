# ⚽ Sports Center Pro

Sistema de gestión completo para canchas deportivas. Incluye alquiler de cancha, campeonatos, productos, bebidas, ventas y reportes con KPIs.

---

## 🗂 Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs, gráficas de ingresos, ventas recientes |
| **Alquiler Cancha** | Reservas con cálculo automático por hora |
| **Campeonatos** | Torneos, equipos, inscripciones |
| **Productos** | Crear productos desde 0, stock, alertas |
| **Bebidas** | Punto de venta rápido tipo POS |
| **Ventas / Caja** | Historial de todas las transacciones |
| **Reportes** | Análisis por período, exportación CSV |

---

## 🚀 GUÍA DE DESPLIEGUE PASO A PASO

### PASO 1 — Subir a GitHub

1. Ve a **github.com** → **New repository**
2. Nombre: `sports-center` → **Create repository**
3. En tu computador, abre la terminal en la carpeta del proyecto:

```bash
cd sports-center
git init
git add .
git commit -m "feat: Sports Center Pro - sistema completo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sports-center.git
git push -u origin main
```

---

### PASO 2 — Configurar Supabase

1. Ve a **supabase.com** → inicia sesión → **New Project**
2. Nombre: `sports-center` | Elige región más cercana | Crea una contraseña segura
3. Espera ~2 minutos a que se cree el proyecto
4. Ve a **SQL Editor** (panel izquierdo)
5. Copia y pega el contenido completo de `supabase-schema.sql`
6. Haz clic en **Run** ▶

7. Ve a **Settings → API**
8. Copia:
   - `Project URL` → es tu `SUPABASE_URL`
   - `anon public` key → es tu `SUPABASE_ANON_KEY`

---

### PASO 3 — Desplegar en Vercel

1. Ve a **vercel.com** → inicia sesión con GitHub
2. Haz clic en **Add New → Project**
3. Selecciona el repositorio `sports-center`
4. En **Environment Variables**, agrega:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Tu Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |

5. Haz clic en **Deploy** 🚀
6. En ~2 minutos tendrás tu URL: `sports-center-xxx.vercel.app`

---

### PASO 4 — Verificar que funciona

1. Abre la URL de Vercel
2. El dashboard debe cargar (vacío es normal al inicio)
3. Ve a **Productos** → crea un producto de prueba
4. Ve a **Ventas** → registra una venta
5. Vuelve al **Dashboard** → verás los datos

---

## 🔧 Desarrollo local

```bash
# Clonar
git clone https://github.com/TU_USUARIO/sports-center.git
cd sports-center

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Edita .env.local con tus credenciales de Supabase

# Iniciar servidor de desarrollo
npm run dev
# Abre http://localhost:3000
```

---

## 📁 Estructura del proyecto

```
sports-center/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard
│   │   ├── reservas/page.tsx     # Alquiler de cancha
│   │   ├── campeonatos/page.tsx  # Campeonatos y equipos
│   │   ├── productos/page.tsx    # Gestión de productos
│   │   ├── bebidas/page.tsx      # POS de bebidas
│   │   ├── ventas/page.tsx       # Caja / historial
│   │   └── reportes/page.tsx     # KPIs y reportes
│   ├── components/ui/
│   │   ├── Sidebar.tsx           # Navegación lateral
│   │   ├── AppLayout.tsx         # Layout principal
│   │   └── Modal.tsx             # Modal reutilizable
│   └── lib/
│       ├── supabase.ts           # Cliente y tipos
│       └── utils.ts              # Helpers y formatters
├── supabase-schema.sql           # Schema completo de BD
└── .env.local.example            # Variables de entorno
```

---

## 🛠 Personalización rápida

### Cambiar nombre de la cancha
En Supabase → Table Editor → tabla `fields` → edita el nombre

### Cambiar precio por hora
En Supabase → tabla `fields` → edita `price_per_hour`

### Agregar más canchas
En la app → próximamente en configuración, o directo en Supabase → `fields`

### Cambiar moneda (COP por defecto)
En `src/lib/utils.ts` → función `formatCurrency` → cambia `'COP'` por tu moneda

---

## 🗄 Tablas de la base de datos

| Tabla | Descripción |
|-------|-------------|
| `fields` | Canchas disponibles |
| `reservations` | Alquileres/reservas |
| `championships` | Campeonatos |
| `teams` | Equipos inscritos |
| `matches` | Partidos programados |
| `products` | Productos y bebidas |
| `product_categories` | Categorías |
| `sales` | Registro de ventas |
| `sale_items` | Detalle de ventas |
| `stock_movements` | Movimientos de inventario |
| `customers` | Clientes |
