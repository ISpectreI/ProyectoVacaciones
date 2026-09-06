'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TablaColaboradores from './components/TablaColaboradores'
import CalendarioCoincidencias from './components/CalendarioCoincidencias'
import HistorialVacaciones from './components/HistorialVacaciones'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'saldos' | 'calendario' | 'historial'>('saldos')
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [equipos, setEquipos] = useState<any[]>([])
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)

    // 1. Cargar Equipos
    const { data: eqData } = await supabase
      .from('equipos')
      .select('*')
      .order('nombre')
    if (eqData) setEquipos(eqData)

    // 2. Cargar Colaboradores
    const { data: colData } = await supabase
      .from('colaboradores')
      .select('*, equipos(nombre)')
      .order('nombre')
    if (colData) setColaboradores(colData)

    // 3. Cargar desde la tabla 'historial'
    const { data: solData } = await supabase
      .from('historial')
      .select('*, colaboradores(*, equipos(*))')
      .order('fecha_inicio', { ascending: false })

    if (solData) setSolicitudes(solData)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ENCABEZADO */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Gestión de Vacaciones - Área Operativa
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Control de saldos, programación de periodos y coincidencias por equipo
            </p>
          </div>
          <span className="bg-blue-50 text-blue-700 font-semibold px-3 py-1.5 rounded-full text-xs">
            {colaboradores.length} Empleados Activos
          </span>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('saldos')}
            className={`py-2 px-4 font-semibold text-sm rounded-t-lg transition ${
              activeTab === 'saldos'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gestión y Saldos
          </button>

          <button
            onClick={() => setActiveTab('calendario')}
            className={`py-2 px-4 font-semibold text-sm rounded-t-lg transition ${
              activeTab === 'calendario'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Calendario / Coincidencias
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`py-2 px-4 font-semibold text-sm rounded-t-lg transition ${
              activeTab === 'historial'
                ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Historial de Solicitudes
          </button>
        </div>

        {/* CONTENIDO SEGÚN LA PESTAÑA */}
        {activeTab === 'saldos' && (
          <TablaColaboradores
            colaboradores={colaboradores}
            equipos={equipos}
            solicitudes={solicitudes}
            loading={loading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'calendario' && (
          <CalendarioCoincidencias
            solicitudes={solicitudes}
            equipos={equipos}
            loading={loading}
          />
        )}

        {activeTab === 'historial' && (
          <HistorialVacaciones
            solicitudes={solicitudes}
            loading={loading}
            onRefresh={fetchData}
          />
        )}
      </div>
    </main>
  )
}