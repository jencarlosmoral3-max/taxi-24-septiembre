# Pantallas y flujos — Vyro (app del Sindicato 24 de Septiembre)

Una sola app móvil con modo **Pasajero** y modo **Conductor** (switch en perfil, como inDrive). El modo conductor solo se habilita cuando el sindicato aprueba al conductor. Más un **panel web** para la directiva.

## Común
1. Splash
2. Onboarding (3 slides: pide tu taxi · ofrece tu precio · conductores del sindicato verificados)
3. Login con Google (un botón)
4. Teléfono de contacto (+591, celular; lo ve la contraparte solo con viaje asignado)
5. Registro: nombre + foto (opcional)
6. Permiso de ubicación (explicación antes del diálogo del sistema)
7. Perfil y ajustes (switch Pasajero/Conductor, cerrar sesión, eliminar cuenta)
8. Soporte / FAQ (WhatsApp del sindicato, preguntas frecuentes)
9. Historial de viajes + detalle de viaje

## Pasajero
1. **Home:** mapa con ubicación actual + sheet "¿A dónde vas?"
2. **Buscar destino:** autocomplete (Google Places), lugares guardados (casa, trabajo), "fijar en mapa"
3. **Ofrecer tarifa:** origen/destino, tarifa sugerida, mínimo del sindicato, input Bs, nº pasajeros, comentario al conductor, "Pago en efectivo"
4. **Esperando ofertas:** animación de búsqueda, botón "subir tarifa", cancelar
5. **Lista de ofertas:** cards con foto del conductor, nombre, rating, auto (marca, color, placa), nº interno del sindicato, ETA, precio ofertado; Aceptar / Rechazar; cada oferta con cuenta regresiva
6. **Conductor en camino:** mapa con el taxi en vivo, ETA, datos del auto, Llamar, Cancelar (con motivo)
7. **Conductor llegó:** aviso + datos del auto destacados
8. **Viaje en curso:** ruta, botón **SOS** (llama al 110 + alerta al sindicato)
9. **Fin del viaje:** monto a pagar en efectivo + calificar (1–5 estrellas, comentario)
10. **Cancelación:** motivos predefinidos

## Conductor
1. **Registro conductor (4 pasos):** (1) datos personales + nº interno/socio del sindicato · (2) licencia + CI (fotos) · (3) vehículo: placa, marca, modelo, color, año, RUAT, SOAT · (4) fotos del vehículo y selfie
2. **Pendiente de aprobación:** estado + contacto del sindicato
3. **Home:** mapa + toggle **En línea / Fuera de línea**, ganancias del día
4. **Solicitudes entrantes:** lista/stack de pedidos cercanos: distancia al pasajero, origen → destino, tarifa ofrecida; Aceptar a ese precio · Contraofertar (+1, +2, +5 Bs o monto libre) · Ignorar
5. **Esperando respuesta del pasajero:** cuenta regresiva de la oferta
6. **Ir a recoger:** mapa + botón "Navegar" (deep link a Google Maps/Waze), Llamar, Cancelar
7. **Llegué:** notifica al pasajero
8. **Viaje en curso:** botón "Finalizar viaje", SOS
9. **Cobro en efectivo + calificar al pasajero**
10. **Ganancias:** hoy / semana, nº de viajes, lista

## Panel web del sindicato (admin)
1. Login (solo usuarios con rol admin)
2. Solicitudes de conductores: ver documentos, aprobar / rechazar con motivo
3. Padrón de conductores y vehículos: buscar, suspender/reactivar
4. Viajes: en vivo (mapa) e historial con filtros
5. SOS e incidencias: alertas en tiempo real, marcar atendida
6. Configuración: tarifa mínima, radio de búsqueda, expiración de ofertas y de pedidos

## Flujo de la puja (resumen)
Pasajero crea pedido con tarifa → conductores en línea dentro del radio lo reciben → cada conductor acepta a ese precio o contraoferta (una oferta activa por conductor, expira en ~45 s) → el pasajero ve las ofertas y acepta una → el viaje queda asignado y el resto de ofertas se rechazan → recogida → viaje → pago en efectivo → calificación mutua. Si nadie ofrece, el pasajero puede subir la tarifa; el pedido expira a los N minutos (configurable).

## Fuera del MVP (V2)
Chat in-app, programar viajes, compartir viaje por link, QR de pago, iOS, modo claro.
