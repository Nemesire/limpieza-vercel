
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Camera,
  X,
  Upload,
  ChevronRight,
  AlertCircle,
  ClipboardPaste,
  ShoppingCart,
  PackageSearch,
  AlertTriangle,
  ChevronDown,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Zap,
  Users,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Star,
  ClipboardCheck,
  LogOut as LogOutIcon,
  LogIn as LogInIcon,
  Repeat
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { geminiService } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { properties, reservations, inventory, isLoading, addBulkReservations } = useStore();
  const navigate = useNavigate();
  
  // AI Import State
  const [showAiModal, setShowAiModal] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para el modal de Día Crítico
  const [selectedCriticalDay, setSelectedCriticalDay] = useState<{
    date: string;
    collisions: {
      propertyId: string;
      propertyName: string;
      outGuest: any;
      inGuest: any;
    }[];
  } | null>(null);

  // Fechas útiles
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Cálculo de Limpiezas para el Widget de Cabecera
  const cleaningsTodayInfo = useMemo(() => {
    const todayCleanings = reservations.filter(r => r.checkOut === todayStr);
    return todayCleanings.map(res => {
      const prop = properties.find(p => p.id === res.propertyId);
      return prop?.internalName || prop?.name || 'Desconocido';
    });
  }, [reservations, properties, todayStr]);

  // Cálculo de Días Críticos Generales
  const criticalDays = useMemo(() => {
    const datesMap: Record<string, Set<string>> = {};
    reservations.forEach(res => {
      const { propertyId, checkOut } = res;
      if (reservations.some(r => r.propertyId === propertyId && r.checkIn === checkOut)) {
        if (!datesMap[checkOut]) datesMap[checkOut] = new Set();
        datesMap[checkOut].add(propertyId);
      }
    });
    return Object.entries(datesMap)
      .map(([date, props]) => ({ date, count: props.size, propertyIds: Array.from(props) }))
      .filter(d => d.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4); 
  }, [reservations, todayStr]);

  // LÓGICA REFORZADA: Casa Amplia para Grupos y Familia
  const casaAmpliaCritical = useMemo(() => {
    // Buscamos por nombre interno o comercial
    const casaAmplia = properties.find(p => 
      (p.internalName || p.name).toUpperCase().includes("CASA AMPLIA")
    );
    if (!casaAmplia) return null;

    const criticalRes = reservations.find(res => {
      return res.propertyId === casaAmplia.id && 
             res.checkOut >= todayStr && 
             reservations.some(r => r.propertyId === casaAmplia.id && r.checkIn === res.checkOut);
    });

    if (!criticalRes) return { property: casaAmplia, date: null };

    const date = criticalRes.checkOut;
    const outGuest = criticalRes;
    const inGuest = reservations.find(r => r.propertyId === casaAmplia.id && r.checkIn === date);

    return {
      property: casaAmplia,
      date,
      outGuest,
      inGuest
    };
  }, [reservations, properties, todayStr]);

  const handleOpenCriticalDetail = (date: string, propertyIds: string[]) => {
    const collisions = propertyIds.map(pid => {
      const property = properties.find(p => p.id === pid);
      const outGuest = reservations.find(r => r.propertyId === pid && r.checkOut === date);
      const inGuest = reservations.find(r => r.propertyId === pid && r.checkIn === date);
      return { 
        propertyId: pid, 
        propertyName: property?.internalName || property?.name || 'Desconocido', 
        outGuest, 
        inGuest 
      };
    });
    setSelectedCriticalDay({ date, collisions });
  };

  const shoppingList = useMemo(() => inventory.filter(item => item.stock <= item.minStock), [inventory]);

  const stats = useMemo(() => {
    const todayCleaningsRes = reservations.filter(r => r.checkOut === todayStr);
    const todayCheckInsRes = reservations.filter(r => r.checkIn === todayStr);
    const todayCheckOutsRes = reservations.filter(r => r.checkOut === todayStr);

    return [
      { 
        label: 'Limpiezas Hoy', 
        val: todayCleaningsRes.length.toString(), 
        color: 'bg-blue-600 text-white', 
        icon: CheckCircle2, 
        action: () => navigate('/schedule'),
        details: [
          { label: 'Salidas', val: todayCheckOutsRes.length, icon: LogOutIcon },
          { label: 'Entradas', val: todayCheckInsRes.length, icon: LogInIcon }
        ]
      },
      { 
        label: 'CHECK-IN', 
        val: todayCheckInsRes.length.toString(), 
        color: 'bg-emerald-500 text-white', 
        icon: LogIn, 
        action: () => navigate('/calendar'),
        propertyList: todayCheckInsRes.map(r => {
          const p = properties.find(prop => prop.id === r.propertyId);
          return { name: p?.internalName || p?.name || '?', isTurnover: false };
        })
      },
      { 
        label: 'CHECK-OUT', 
        val: todayCheckOutsRes.length.toString(), 
        color: 'bg-red-600 text-white', 
        icon: LogOut, 
        action: () => navigate('/calendar'),
        propertyList: todayCheckOutsRes.map(r => {
          const p = properties.find(prop => prop.id === r.propertyId);
          // Verificar si es rotatorio: hay entrada hoy para este mismo propertyId
          const isTurnover = todayCheckInsRes.some(inRes => inRes.propertyId === r.propertyId);
          return { name: p?.internalName || p?.name || '?', isTurnover };
        })
      },
      { label: 'Falta Stock', val: shoppingList.length.toString(), color: 'bg-amber-500 text-white', icon: ShoppingCart, action: () => navigate('/inventory') },
      { label: 'Total Reservas', val: reservations.length.toString(), color: 'bg-gray-900 text-white', icon: Clock, action: () => navigate('/calendar') },
    ];
  }, [reservations, properties, shoppingList, todayStr, navigate]);

  const processImageForAi = async (base64: string) => {
    setIsAiProcessing(true);
    try {
      const propertyNames = properties.map(p => p.internalName || p.name);
      const results = await geminiService.parseReservationsFromImage(base64, propertyNames);
      setExtractedData(results.map((res: any) => ({ 
        ...res, 
        propertyId: properties.find(p => 
          (p.internalName || p.name).toLowerCase().includes(res.propertyName?.toLowerCase())
        )?.id || properties[0]?.id 
      })));
    } catch (err: any) { setError(err.message); } finally { setIsAiProcessing(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left pb-12">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="flex flex-col md:flex-row md:items-center gap-10">
          <div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic leading-none">Gestión Logística</h2>
            <p className="text-gray-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Bienvenido al Centro de Mando</p>
          </div>

          {/* WIDGET AMPLIADO: LIMPIEZAS HOY (CABECERA) */}
          <button 
            onClick={() => navigate('/schedule')}
            className="flex items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2.2rem] border-2 border-gray-100 dark:border-slate-800 shadow-sm hover:border-blue-500 hover:shadow-2xl transition-all group min-w-[320px] max-w-2xl"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              <ClipboardCheck size={32} />
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-2 italic">Limpiezas Hoy ({cleaningsTodayInfo.length})</p>
              <div className="flex flex-wrap gap-2.5">
                {cleaningsTodayInfo.length > 0 ? (
                  cleaningsTodayInfo.slice(0, 4).map((name, idx) => (
                    <span key={idx} className="text-[11px] font-black text-gray-900 dark:text-white uppercase italic bg-gray-50 dark:bg-slate-800 px-4 py-1.5 rounded-full border border-gray-100 dark:border-slate-700 truncate max-w-[150px] shadow-sm">
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter italic">Operación Despejada</span>
                )}
                {cleaningsTodayInfo.length > 4 && (
                  <span className="text-xs font-black text-blue-500 uppercase italic flex items-center">+{cleaningsTodayInfo.length - 4} más</span>
                )}
              </div>
            </div>
          </button>
        </div>

        <button onClick={() => setShowAiModal(true)} className="px-8 py-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:shadow-2xl transition-all shadow-lg shadow-blue-200 shrink-0">
          <Sparkles size={18} /> Escanear Reservas
        </button>
      </header>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <button key={i} onClick={stat.action} className={`${stat.color} p-6 rounded-[2.2rem] shadow-xl flex flex-col gap-4 transition-all hover:scale-[1.03] text-left group relative overflow-hidden min-h-[160px]`}>
            <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-150 transition-transform duration-700"><stat.icon size={100} /></div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-md shrink-0"><stat.icon size={20} /></div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black leading-none tracking-tighter">{stat.val}</p>
                </div>
              </div>
              
              {/* Lista de propiedades (Entradas/Salidas) */}
              {stat.propertyList && stat.propertyList.length > 0 && (
                <div className="mt-4 space-y-2">
                  {stat.propertyList.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
                      <p className="text-[9px] font-black uppercase italic truncate text-white">{item.name}</p>
                      {item.isTurnover && (
                        <span className="flex items-center gap-1 bg-white text-red-600 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase italic animate-pulse shrink-0">
                          <Repeat size={8} /> Rotatorio
                        </span>
                      )}
                    </div>
                  ))}
                  {stat.propertyList.length > 3 && (
                    <p className="text-[8px] font-black uppercase text-white/60 ml-2">+{stat.propertyList.length - 3} más...</p>
                  )}
                </div>
              )}

              {/* Detalles específicos para Limpiezas Hoy si existen */}
              {stat.details && (
                <div className="mt-4 pt-4 border-t border-white/20 flex gap-4">
                  {stat.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex flex-col">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1">
                        {detail.icon && <detail.icon size={8} />} {detail.label}
                      </p>
                      <p className="text-lg font-black italic leading-none mt-1">{detail.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Widgets de Día Crítico */}
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-red-100 dark:border-red-900/30 pb-3">
            <Zap size={22} className="text-red-600 fill-red-600" />
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Día Crítico (General)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {criticalDays.length > 0 ? (
              criticalDays.map((day, i) => (
                <div key={i} onClick={() => handleOpenCriticalDetail(day.date, day.propertyIds)} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-red-500/20 hover:border-red-500 shadow-lg cursor-pointer group relative overflow-hidden">
                  <div className="absolute top-[-20px] right-[-20px] text-red-500/5 group-hover:rotate-12 transition-transform"><AlertTriangle size={80} /></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-1">
                      <Calendar size={12} /> {day.date === todayStr ? 'HOY' : new Date(day.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                    </p>
                    <h4 className="text-4xl font-black text-gray-900 dark:text-white leading-none mb-1">{day.count}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Anuncios en rotación</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 px-10 bg-emerald-50/50 dark:bg-emerald-900/5 rounded-[2rem] border-2 border-dashed border-emerald-100 flex items-center justify-center gap-4">
                <CheckCircle2 className="text-emerald-500" size={24} />
                <p className="text-sm font-black text-emerald-600 uppercase italic tracking-tight">No hay rotaciones críticas generales.</p>
              </div>
            )}
          </div>
        </section>

        {/* WIDGET REFORZADO: CASA AMPLIA */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-indigo-100 dark:border-indigo-900/30 pb-3">
            <ShieldAlert size={22} className="text-indigo-600 fill-indigo-600" />
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Día Crítico Reforzado: Casa Amplia</h3>
          </div>
          
          {casaAmpliaCritical && casaAmpliaCritical.date ? (
            <div 
              onClick={() => handleOpenCriticalDetail(casaAmpliaCritical.date!, [casaAmpliaCritical.property!.id])}
              className="bg-gray-900 dark:bg-slate-900 p-8 rounded-[3rem] border-4 border-indigo-500 shadow-2xl relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
            >
              <div className="absolute top-[-30px] right-[-30px] text-indigo-500/10 group-hover:scale-125 transition-transform"><Star size={200} /></div>
              
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="space-y-2">
                  <span className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase rounded-full tracking-widest animate-pulse">Operación Prioritaria</span>
                  <h4 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{casaAmpliaCritical.property?.internalName || casaAmpliaCritical.property?.name}</h4>
                  <p className="text-indigo-300 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Calendar size={14} /> {new Date(casaAmpliaCritical.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowUpRight size={14}/> Salida</p>
                    <p className="text-lg font-black text-white uppercase italic truncate">{casaAmpliaCritical.outGuest?.guestName}</p>
                    <p className="text-[10px] font-bold text-gray-400 italic">A las {casaAmpliaCritical.outGuest?.checkOutTime || '11:00'}</p>
                  </div>
                  <div className="flex-1 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowDownRight size={14}/> Entrada</p>
                    <p className="text-lg font-black text-white uppercase italic truncate">{casaAmpliaCritical.inGuest?.guestName}</p>
                    <p className="text-[10px] font-bold text-gray-400 italic">A las {casaAmpliaCritical.inGuest?.checkInTime || '14:00'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <button className="px-10 py-5 bg-white text-gray-900 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 ml-auto group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    Gestionar Ahora <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-gray-50 dark:bg-slate-900/50 rounded-[3rem] border-4 border-dashed border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-gray-300 shadow-sm"><CheckCircle2 size={32} /></div>
                <div>
                  <p className="text-xl font-black text-gray-400 uppercase italic tracking-tighter">Sin rotaciones críticas próximas</p>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{casaAmpliaCritical?.property?.internalName || 'Casa Amplia'}: Operación Normal</p>
                </div>
              </div>
              <Sparkles size={32} className="text-gray-100" />
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-gray-100 dark:border-slate-800 pb-4">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
                 <Calendar size={24} className="text-blue-600" /> Próximas Estancias
              </h3>
              <Link to="/calendar" className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">Ver Todo <ChevronRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {reservations.slice(0, 3).map((res) => {
                const prop = properties.find(p => p.id === res.propertyId);
                return (
                  <div key={res.id} onClick={() => navigate(`/property/${res.propertyId}`)} className="p-6 bg-white dark:bg-slate-900 rounded-[2.2rem] border-2 border-transparent hover:border-blue-500 shadow-sm hover:shadow-xl transition-all flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden"><img src={prop?.imageUrl} className="w-full h-full object-cover" /></div>
                      <div>
                        <p className="font-black text-gray-900 dark:text-white uppercase italic text-lg leading-tight">{res.guestName}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mt-1"><MapPin size={12} className="text-blue-500" /> {prop?.internalName || prop?.name}</p>
                      </div>
                    </div>
                    <div className="text-right"><p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{new Date(res.checkIn).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p></div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* LISTA DE COMPRA */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-gray-100 dark:border-slate-800 pb-4"><h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3"><ShoppingCart size={24} className="text-amber-500" /> Lista de Compra</h3></div>
          <div onClick={() => navigate('/inventory')} className={`cursor-pointer rounded-[2.5rem] border-4 p-8 relative overflow-hidden transition-all ${shoppingList.length > 0 ? 'border-amber-500 bg-amber-50/20' : 'border-emerald-500 bg-emerald-50/20'}`}>
            <div className="relative z-10 space-y-6">
              <h4 className="text-3xl font-black uppercase italic leading-none">{shoppingList.length > 0 ? 'REPOSICIÓN NECESARIA' : 'STOCK ÓPTIMO'}</h4>
              <button className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white ${shoppingList.length > 0 ? 'bg-amber-600' : 'bg-emerald-600'}`}>Ver Inventario</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DETALLE DÍA CRÍTICO */}
      {selectedCriticalDay && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-gray-50 dark:bg-slate-950 rounded-[3rem] w-full max-w-4xl p-12 shadow-2xl animate-in zoom-in-95 duration-200 border-4 border-red-600/30">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm font-black text-red-600 uppercase tracking-[0.4em] mb-2 italic">Desglose Crítico</p>
                <h4 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">{selectedCriticalDay.date === todayStr ? 'HOY' : new Date(selectedCriticalDay.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }).toUpperCase()}</h4>
              </div>
              <button onClick={() => setSelectedCriticalDay(null)} className="p-4 bg-white dark:bg-slate-900 text-gray-400 hover:text-red-500 rounded-3xl active:scale-90 transition-all"><X size={32} /></button>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {selectedCriticalDay.collisions.map((collision, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-gray-100 dark:border-slate-800 flex items-center justify-between gap-8 group hover:border-red-500">
                  <div className="flex-1 text-left">
                    <h5 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic mb-4">{collision.propertyName}</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-orange-600 uppercase">Sale: {collision.outGuest?.guestName}</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-emerald-600">Entra: {collision.inGuest?.guestName}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedCriticalDay(null); navigate(`/property/${collision.propertyId}`); }} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px]">Ver Anuncio</button>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-end"><button onClick={() => setSelectedCriticalDay(null)} className="px-12 py-5 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-[2rem] font-black uppercase tracking-widest">Cerrar</button></div>
          </div>
        </div>
      )}

      {/* AI Modal Placeholder */}
      {showAiModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl p-10 text-center">
             <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic mb-6">Importación IA</h4>
             <button onClick={() => setShowAiModal(false)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
