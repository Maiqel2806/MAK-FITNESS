'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  Package,
  BarChart3,
  Dumbbell,
  ClipboardCheck,
  Menu,
  X,
  LogOut,
  UserCog,
  ShieldCheck,
  DollarSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

const navBase = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['dueno', 'empleado'],
  },
  {
    href: '/miembros',
    icon: Users,
    label: 'Miembros',
    roles: ['dueno', 'empleado'],
  },
  {
    href: '/membresias',
    icon: CreditCard,
    label: 'Membresías',
    roles: ['dueno', 'empleado'],
  },
  {
    href: '/asistencia',
    icon: ClipboardCheck,
    label: 'Asistencia',
    roles: ['dueno', 'empleado'],
  },
  {
    href: '/clases',
    icon: Calendar,
    label: 'Clases',
    roles: ['dueno'],
  },
  {
    href: '/inventario',
    icon: Package,
    label: 'Inventario',
    roles: ['dueno', 'empleado'],
  },
  {
    href: '/caja',
    icon: DollarSign,
    label: 'Caja',
    roles: ['dueno'],
  },
  {
    href: '/reportes',
    icon: BarChart3,
    label: 'Reportes',
    roles: ['dueno'],
  },
  {
    href: '/usuarios',
    icon: UserCog,
    label: 'Usuarios',
    roles: ['dueno'],
  },
  {
    href: '/auditoria',
    icon: ShieldCheck,
    label: 'Auditoría',
    roles: ['dueno'],
  },
]

export default function Sidebar({ perfil }) {
  const path = usePathname()
  const router = useRouter()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const nav = navBase.filter((item) => item.roles.includes(perfil?.rol))

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setMenuAbierto(false)
    router.replace('/login')
    router.refresh()
  }

  function NavLinks() {
    return (
      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              onClick={cerrarMenu}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                active
                  ? 'bg-black font-semibold text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  function Footer() {
    return (
      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">
            {perfil?.nombre}
          </p>
          <p className="text-xs text-gray-500">
            {perfil?.rol === 'dueno' ? 'Administrador' : 'Empleado'}
          </p>
        </div>

        <button
          onClick={cerrarSesion}
          className="mb-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>

        <p className="text-xs text-gray-400">
          v1.0 · Administración
        </p>
      </div>
    )
  }

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black">
            <Dumbbell size={20} className="text-white" />
          </div>

          <div>
            <h1 className="text-sm font-bold text-gray-900">MAK FITNESS</h1>
            <p className="text-xs text-gray-500">Sistema Admin</p>
          </div>
        </div>

        <button
          onClick={() => setMenuAbierto(true)}
          className="rounded-xl border border-gray-200 p-2 text-gray-700"
        >
          <Menu size={22} />
        </button>
      </header>

      <aside className="hidden min-h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black">
            <Dumbbell size={20} className="text-white" />
          </div>

          <div>
            <h1 className="text-sm font-bold text-gray-900">MAK FITNESS</h1>
            <p className="text-xs text-gray-500">Sistema Admin</p>
          </div>
        </div>

        <NavLinks />

        <Footer />
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={cerrarMenu}
            aria-label="Cerrar menú"
          />

          <aside className="relative flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black">
                  <Dumbbell size={20} className="text-white" />
                </div>

                <div>
                  <h1 className="text-sm font-bold text-gray-900">
                    MAK FITNESS
                  </h1>
                  <p className="text-xs text-gray-500">Sistema Admin</p>
                </div>
              </div>

              <button
                onClick={cerrarMenu}
                className="rounded-xl border border-gray-200 p-2 text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <NavLinks />

            <Footer />
          </aside>
        </div>
      )}
    </>
  )
}