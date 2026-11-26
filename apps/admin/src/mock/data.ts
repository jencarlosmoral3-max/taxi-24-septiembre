// Datos de ejemplo de la fase 1. La fase 2 los reemplaza por consultas a Supabase.

export type DocKind = "Licencia" | "CI" | "RUAT" | "SOAT" | "Fotos del vehículo" | "Selfie";
export const DOC_KINDS: DocKind[] = ["Licencia", "CI", "RUAT", "SOAT", "Fotos del vehículo", "Selfie"];

export type Vehiculo = { marca: string; modelo: string; anio: number; color: string; placa: string };

export type Solicitud = {
  id: string;
  nombre: string;
  ci: string;
  telefono: string;
  nroInterno: string;
  enviada: string;
  vehiculo: Vehiculo;
};

export const solicitudes: Solicitud[] = [
  { id: "s1", nombre: "Marcelo Antelo Vaca", ci: "5123478 SC", telefono: "+591 7712 3456", nroInterno: "114", enviada: "26 nov, 08:12", vehiculo: { marca: "Toyota", modelo: "Vitz", anio: 2012, color: "Blanco", placa: "2845-KLM" } },
  { id: "s2", nombre: "Rosa Mamani Quispe", ci: "7894561 SC", telefono: "+591 6934 8821", nroInterno: "207", enviada: "25 nov, 17:40", vehiculo: { marca: "Suzuki", modelo: "Alto", anio: 2015, color: "Amarillo", placa: "3310-PTR" } },
  { id: "s3", nombre: "Julio César Roca Justiniano", ci: "4456120 SC", telefono: "+591 7601 2290", nroInterno: "058", enviada: "25 nov, 11:03", vehiculo: { marca: "Nissan", modelo: "Tiida", anio: 2010, color: "Gris", placa: "1977-BDX" } },
  { id: "s4", nombre: "Verónica Súarez Parada", ci: "8120937 SC", telefono: "+591 7855 0147", nroInterno: "231", enviada: "24 nov, 15:26", vehiculo: { marca: "Hyundai", modelo: "i10", anio: 2018, color: "Plomo", placa: "4102-HGF" } },
];

export type EstadoConductor = "aprobado" | "suspendido";

export type Conductor = {
  id: string;
  nombre: string;
  nroInterno: string;
  telefono: string;
  vehiculo: string;
  placa: string;
  estado: EstadoConductor;
  viajes: number;
  calificacion: number;
};

export const conductores: Conductor[] = [
  { id: "c1", nombre: "Carlos Rivero Egüez", nroInterno: "012", telefono: "+591 7701 1122", vehiculo: "Toyota Corolla 2014 · Blanco", placa: "1520-ABC", estado: "aprobado", viajes: 1284, calificacion: 4.9 },
  { id: "c2", nombre: "Ana Lía Chávez Moreno", nroInterno: "045", telefono: "+591 6988 4410", vehiculo: "Suzuki Swift 2016 · Rojo", placa: "2231-DEF", estado: "aprobado", viajes: 902, calificacion: 4.8 },
  { id: "c3", nombre: "Pedro Gutiérrez Salvatierra", nroInterno: "078", telefono: "+591 7745 9033", vehiculo: "Nissan Versa 2013 · Plomo", placa: "0987-GHI", estado: "suspendido", viajes: 455, calificacion: 3.9 },
  { id: "c4", nombre: "Luis Fernando Añez Rojas", nroInterno: "093", telefono: "+591 7622 5871", vehiculo: "Toyota Vitz 2011 · Amarillo", placa: "3344-JKL", estado: "aprobado", viajes: 2210, calificacion: 4.7 },
  { id: "c5", nombre: "María Elena Tapia Cuéllar", nroInterno: "131", telefono: "+591 7390 2468", vehiculo: "Kia Picanto 2017 · Blanco", placa: "2760-MNO", estado: "aprobado", viajes: 633, calificacion: 4.9 },
  { id: "c6", nombre: "Ramiro Soliz Vargas", nroInterno: "150", telefono: "+591 6711 7790", vehiculo: "Hyundai Accent 2012 · Negro", placa: "1409-PQR", estado: "suspendido", viajes: 121, calificacion: 3.5 },
  { id: "c7", nombre: "Diego Barba Mendoza", nroInterno: "188", telefono: "+591 7288 3351", vehiculo: "Suzuki Alto 2019 · Celeste", placa: "4518-STU", estado: "aprobado", viajes: 340, calificacion: 4.6 },
  { id: "c8", nombre: "Gladys Ribera Pedraza", nroInterno: "202", telefono: "+591 7099 6612", vehiculo: "Toyota Yaris 2015 · Gris", placa: "2914-VWX", estado: "aprobado", viajes: 778, calificacion: 4.8 },
];

export type EstadoViaje = "en curso" | "completado" | "cancelado";

export type Viaje = {
  id: string;
  fecha: string; // ISO yyyy-mm-dd
  hora: string;
  pasajero: string;
  conductor: string;
  origen: string;
  destino: string;
  tarifa: number; // Bs
  estado: EstadoViaje;
};

export const viajes: Viaje[] = [
  { id: "v1042", fecha: "2026-11-26", hora: "09:41", pasajero: "Camila Soria", conductor: "Carlos Rivero Egüez", origen: "Plaza 24 de Septiembre", destino: "Aeropuerto Viru Viru", tarifa: 85, estado: "en curso" },
  { id: "v1041", fecha: "2026-11-26", hora: "09:35", pasajero: "Jorge Peña", conductor: "Ana Lía Chávez Moreno", origen: "Equipetrol, Av. San Martín", destino: "Mercado Los Pozos", tarifa: 22, estado: "en curso" },
  { id: "v1040", fecha: "2026-11-26", hora: "09:28", pasajero: "Lucía Vaca", conductor: "Luis Fernando Añez Rojas", origen: "Cristo Redentor, 2° anillo", destino: "Hospital Japonés", tarifa: 18, estado: "en curso" },
  { id: "v1039", fecha: "2026-11-26", hora: "08:50", pasajero: "Mario Terceros", conductor: "María Elena Tapia Cuéllar", origen: "Plaza Blacutt", destino: "Terminal Bimodal", tarifa: 30, estado: "completado" },
  { id: "v1038", fecha: "2026-11-26", hora: "08:12", pasajero: "Fabiola Núñez", conductor: "Diego Barba Mendoza", origen: "4° anillo y Beni", destino: "Ventura Mall", tarifa: 25, estado: "completado" },
  { id: "v1037", fecha: "2026-11-25", hora: "21:05", pasajero: "Iván Cuéllar", conductor: "Gladys Ribera Pedraza", origen: "Las Palmas", destino: "Cine Center", tarifa: 20, estado: "cancelado" },
  { id: "v1036", fecha: "2026-11-25", hora: "19:40", pasajero: "Sofía Molina", conductor: "Carlos Rivero Egüez", origen: "Barrio Hamacas", destino: "Catedral", tarifa: 28, estado: "completado" },
  { id: "v1035", fecha: "2026-11-25", hora: "18:02", pasajero: "Rodrigo Peredo", conductor: "Ana Lía Chávez Moreno", origen: "Urbarí", destino: "Avenida Cañoto", tarifa: 24, estado: "completado" },
  { id: "v1034", fecha: "2026-11-24", hora: "13:15", pasajero: "Daniela Justiniano", conductor: "Luis Fernando Añez Rojas", origen: "Plan 3000", destino: "Plaza 24 de Septiembre", tarifa: 35, estado: "completado" },
  { id: "v1033", fecha: "2026-11-24", hora: "07:55", pasajero: "Esteban Roca", conductor: "Pedro Gutiérrez Salvatierra", origen: "Villa 1° de Mayo", destino: "Parque Urbano", tarifa: 27, estado: "cancelado" },
];

// Posiciones de los taxis en la maqueta del mapa (porcentaje del recuadro).
export type TaxiEnVivo = { id: string; nroInterno: string; x: number; y: number; ocupado: boolean };
export const taxisEnVivo: TaxiEnVivo[] = [
  { id: "t1", nroInterno: "012", x: 62, y: 28, ocupado: true },
  { id: "t2", nroInterno: "045", x: 38, y: 44, ocupado: true },
  { id: "t3", nroInterno: "093", x: 54, y: 62, ocupado: true },
  { id: "t4", nroInterno: "131", x: 22, y: 30, ocupado: false },
  { id: "t5", nroInterno: "188", x: 78, y: 55, ocupado: false },
  { id: "t6", nroInterno: "202", x: 45, y: 80, ocupado: false },
  { id: "t7", nroInterno: "058", x: 15, y: 68, ocupado: false },
];

export type Incidente = {
  id: string;
  hora: string;
  pasajero: string;
  conductor: string;
  viaje: string;
  ubicacion: string;
  atendida: boolean;
};

// Más reciente primero.
export const incidentes: Incidente[] = [
  { id: "i3", hora: "26 nov, 09:22", pasajero: "Lucía Vaca", conductor: "Luis Fernando Añez Rojas", viaje: "v1040", ubicacion: "3er anillo externo y Av. Roca y Coronado, frente a la gasolinera", atendida: false },
  { id: "i2", hora: "26 nov, 07:48", pasajero: "Fabiola Núñez", conductor: "Diego Barba Mendoza", viaje: "v1038", ubicacion: "Av. Banzer km 5, cerca del peaje", atendida: false },
  { id: "i1", hora: "25 nov, 22:10", pasajero: "Iván Cuéllar", conductor: "Gladys Ribera Pedraza", viaje: "v1037", ubicacion: "Las Palmas, calle 7 esq. Av. Mutualista", atendida: true },
  { id: "i0", hora: "23 nov, 01:36", pasajero: "Sofía Molina", conductor: "Ramiro Soliz Vargas", viaje: "v1021", ubicacion: "Av. Cristo Redentor y 4° anillo", atendida: true },
];

export type Configuracion = {
  tarifaMinima: number; // Bs
  radioKm: number;
  expiracionOfertaS: number;
  expiracionPedidoMin: number;
};
export const configuracionInicial: Configuracion = { tarifaMinima: 10, radioKm: 3, expiracionOfertaS: 45, expiracionPedidoMin: 5 };

export const adminActual = { nombre: "Héctor Parada", rol: "Secretario general" };
