
'use client'

import { createContext, useContext } from 'react'

const UserContext = createContext(null)

export function UserProvider({ perfil, children }) {
  return (
    <UserContext.Provider value={perfil}>
      {children}
    </UserContext.Provider>
  )
}

export function usePerfil() {
  return useContext(UserContext)
}