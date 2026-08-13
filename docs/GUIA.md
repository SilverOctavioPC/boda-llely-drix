# Guía de uso

Referencia rápida del día a día. Para la instalación desde cero, mira el
[README](../README.md).

---

## Arrancar el servidor

Abre una terminal **nueva** en la carpeta del proyecto y corre:

```powershell
cd c:\Users\CEJA\Desktop\boda-llely-drix
npm run dev
```

Queda corriendo en **http://localhost:5173** con recarga automática: si editas
un archivo, el navegador se actualiza solo.

Para **detenerlo**: `Ctrl + C` en esa terminal.

> Node está instalado en modo portable, en
> `C:\Users\CEJA\AppData\Local\nodejs-portable\`. Esa ruta ya está en el `Path`
> de usuario, así que `npm` funciona en cualquier terminal nueva. Si te dice
> _"npm no se reconoce"_, cierra la terminal y abre una nueva — el `Path` solo
> se lee al abrirla.

### Si el puerto está ocupado

Vite se pasa solo al 5174 y te lo dice en pantalla. Pero los links de prueba de
abajo apuntan al 5173, así que conviene liberarlo. Para ver qué lo ocupa:

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object {
  Get-Process -Id $_.OwningProcess
}
```

Y para cerrarlo, `Stop-Process -Id <PID> -Force`.

---

## Links de prueba

Estos son los 11 invitados **ficticios** que crea `npm run sembrar`. Ninguno
sale del Excel real. Suman **15 personas**, porque dos de ellos llevan
acompañantes.

**Empieza por este** — Patricia Alcázar va con 3 acompañantes, así que verás el
caso completo: un solo QR que vale por 4 personas.

```
http://localhost:5173/rsvp/R26BpMwR9l3bJltsC9Xm
```

| Qué prueba                               | Invitado         | Link                                              |
| ---------------------------------------- | ---------------- | ------------------------------------------------- |
| **Grupo de 4 con nombres**               | Patricia Alcázar | `http://localhost:5173/rsvp/xOBl8FW9fKKauRl8g4P6` |
| **Acompañante sin nombre** ("2 lugares") | Gerardo Pineda   | `http://localhost:5173/rsvp/rPaHLLwaRjCL2L2Mz41N` |
| Formulario de confirmación               | Valentina Ruiz   | `http://localhost:5173/rsvp/SquLqPlAVrbGcSOrDCH5` |
| Flujo de "No podré"                      | Rodrigo Salas    | `http://localhost:5173/rsvp/elwGsEqH2owrmvZw4yqK` |
| Ya confirmó: QR + restricciones          | Camila Ferrer    | `http://localhost:5173/rsvp/GdmwkbTs6nMC29VpfkUJ` |
| QR válido → **verde** al escanear        | Tomás Iriarte    | `http://localhost:5173/rsvp/L2j2Tt9GlJaa8xCKo89n` |
| Niña: Mujer + categoría Niño             | Renata Ocampo    | `http://localhost:5173/rsvp/mro71dYyZ1tnePDOLe1u` |
| Bebé: cuenta aparte, sin menú            | Bruno Sepúlveda  | `http://localhost:5173/rsvp/Qe11ukI7wyc7Yw7ONN12` |
| Ya entró → **ámbar** al escanear         | Ignacio Bustos   | `http://localhost:5173/rsvp/Ry8P1lLTyKDHFuIwNbHs` |
| Dijo NO → **rojo** al escanear           | Lucía Ordóñez    | `http://localhost:5173/rsvp/xtvSftBl63U3u6FXpxOC` |
| Pendiente → **rojo** al escanear         | Esteban Quiroga  | `http://localhost:5173/rsvp/wWrBiZJE1RSGkyPJmEfD` |

Patricia Alcázar lleva a **Héctor Alcázar**, **Sofía (7 años)** y **Mateo
(4 años)** — al escanear su QR deben aparecer los tres por nombre. Gerardo
Pineda lleva un acompañante **sin nombre**, para ver que ese caso también
funciona.

Con estos datos el panel debe mostrar **15 personas** en total, y en la franja
del banquete: **5 adultos · 3 niños · 1 bebé** (9 personas, solo las que
confirmaron que sí).

⚠️ **Estos IDs cambian si vuelves a correr `npm run sembrar`.** El script borra
los anteriores y crea otros nuevos, e imprime los links en pantalla. También
puedes copiar el link de cualquier invitado desde el panel con el botón
**"Link"** de su fila.

### Panel de novios

```
http://localhost:5173/admin
```

Entra con `novios@bodallelydrix.com` y la contraseña que definiste.
(No la anoto aquí a propósito: este archivo puede acabar en GitHub.)

Para el escáner usa `escaner@bodallelydrix.com` — ver
[Las dos cuentas](#las-dos-cuentas).

---

## Las dos cuentas

| Cuenta                      | Para quién              | Qué puede hacer               |
| --------------------------- | ----------------------- | ----------------------------- |
| `novios@bodallelydrix.com`  | Ustedes                 | Todo                          |
| `escaner@bodallelydrix.com` | Quien esté en la puerta | Ver la lista y marcar accesos |

La cuenta de la puerta **no puede** editar invitados, ni crearlos, ni borrarlos,
ni tocar el menú. Al iniciar sesión va directa al escáner y el panel le queda
cerrado: si intenta abrir `/admin`, se la devuelve al escáner.

Eso no es solo la interfaz escondiendo botones — está en
[`firestore.rules`](../firestore.rules). Aunque alguien llamara a la API a mano,
Firestore le responde `403`.

### Por qué dos cuentas

Es mínimo privilegio. Si el celular de la puerta se pierde, se queda
desbloqueado en una mesa o se lo presta a alguien, el daño está acotado a marcar
accesos. Y al terminar la boda desactivas esa cuenta sin tocar la de ustedes.

### Cómo entra quien escanea, sin teclear nada

**La sesión de Firebase se guarda en el navegador y no caduca.** Así que:

1. Antes del evento, en **el celular que se va a usar en la puerta**, entra a
   `/admin/scanner` e inicia sesión con la cuenta de escáner.
2. Esa noche, esa persona solo abre el link y ya está dentro.

Si necesitas cerrar esa sesión, el escáner tiene un botón **Salir** arriba a la
derecha (solo aparece para esa cuenta; ustedes ven "Volver al panel").

### Si cambias el correo de la puerta

Está escrito en **dos sitios que deben coincidir**:

- [`src/lib/roles.js`](../src/lib/roles.js) → `CORREO_ESCANER`
- [`firestore.rules`](../firestore.rules) → dos apariciones

Cambia los dos y **republica las reglas**. Si solo cambias uno, la cuenta nueva
tendría permisos de novios sin que la interfaz lo refleje.

---

## Las tres pantallas

### `/rsvp/:id` — pública, una por invitado

Lo que abre el invitado desde WhatsApp. Ve su nombre precargado, responde
Sí/No, y si dice que sí puede añadir restricciones alimenticias y un mensaje.
Al guardar aparece su **código QR** con botón de descarga.

Si ya había respondido antes, entra directo a su estado y su QR — no le pide
llenar el formulario otra vez.

### `/admin` — panel de novios

Requiere sesión. Métricas arriba, tabla filtrable abajo, y los mensajes que
dejaron los invitados al final. Se actualiza **en tiempo real**: si alguien
confirma mientras lo tienes abierto, el número cambia solo.

### `/admin/scanner` — escáner de entrada

Requiere sesión. Abre la cámara y lee los QR:

| Color    | Significa                                          |
| -------- | -------------------------------------------------- |
| 🟢 Verde | Adelante. Queda registrada su entrada con la hora. |
| 🟡 Ámbar | Ese pase **ya se usó**. Verifica con la persona.   |
| 🔴 Rojo  | No confirmó asistencia, o el código no es válido.  |

Arriba lleva un contador en vivo de cuántos han entrado del total esperado.

---

## Qué puedes hacer en el panel

**➕ Agregar invitado** — botón arriba a la derecha. Al guardar te muestra el
link de RSVP ya generado, con botón de copiar, listo para WhatsApp.

**Acompañantes** — dentro del formulario, tanto al crear como al editar. Con
los botones `−` y `+` indicas cuántos adultos y cuántos niños lleva esa persona.
Por cada uno aparece **nombre y sexo** (y edad, en el caso de los niños), todos
**opcionales**: si no los sabes, déjalos en blanco y el lugar cuenta igual.
Abajo te confirma en todo momento _"Este grupo entra con 4 personas y un solo QR"_.

Los nombres que sí escribas aparecen **en la puerta al escanear**, para poder
cotejar con la gente que tienes enfrente, y salen en el CSV del banquete.

Así funciona un grupo:

- Los acompañantes **no son invitados aparte**: no tienen nombre, ni link, ni
  QR propio. Son lugares que cuelgan del titular.
- El titular recibe **un solo link y un solo QR** que vale por todos. Mandas un
  mensaje, no cuatro.
- En la puerta, al escanear ese QR aparece en grande **"4 personas"** y entra
  el grupo completo de una vez.
- Todos los contadores del panel están **en personas, no en invitaciones**. Un
  grupo de 4 suma 4 al aforo y 4 al banquete.

Para sumarle acompañantes a alguien que ya está en la lista (el caso más común:
_"voy con mi esposa y dos niños"_), búscalo en la tabla, dale a **Editar** y usa
los contadores. No hace falta darlo de alta otra vez.

**Sexo y Categoría son campos distintos.** El Excel original los mezclaba en
una sola columna (`Hombre / Mujer / Niño / Niña / Bebé`), lo que impedía contar
menús infantiles sin perder el sexo. Ahora:

- **Sexo**: Mujer · Hombre · Sin especificar
- **Categoría**: Adulto · Niño · Bebé

Una niña se registra como _Sexo: Mujer_ + _Categoría: Niño_. Al migrar el Excel
la conversión es automática.

**La Categoría solo aparece al editar, no al dar de alta.** Cuando agregas a
alguien nuevo siempre es un adulto: los niños se suman abajo como acompañantes.
Pero el campo sigue existiendo al editar porque de la migración vienen **10
invitados que son niños como titulares** (MAGIE de 7 años, LIAM de 3, Kiara de
10…), y hay que poder corregirlos. Arriba de la tabla verás la franja
**"De los que asistirán: X adultos · Y niños · Z bebés"** — ese es el número que
le pasas al banquete, y solo cuenta a quienes ya confirmaron.

**Editar** — en cada fila. Sirve sobre todo para dos cosas reales de este
proyecto:

- Corregir los ~15 nombres de la Lista Llely que no son nombres propios
  (`ESPOSA`, `PAREJA DE IVÁN`, `GEMELAS`…), sin tocar el Excel ni volver a migrar.
- Marcar confirmaciones a mano cuando alguien te responde por teléfono o en
  persona y nunca abre su link.

**Link** — copia al portapapeles el link de RSVP de esa persona. Útil para
reenviárselo a quien no ha respondido.

**Borrar** — con red de seguridad: si esa persona **ya confirmó que sí** o **ya
registró entrada**, te obliga a escribir su nombre completo antes de dejarte
borrar, y te sugiere que mejor la edites a "No asistirá" para conservar el
registro.

**Descargar CSV** — exporta lo que estés viendo con los filtros aplicados,
incluyendo el menú de cada persona, restricciones alimenticias y el link de cada
quien. Es lo que le pasas al banquete.

**Paginación** — la tabla muestra 25 invitados por página, con _Anterior_ y
_Siguiente_ abajo. Al cambiar cualquier filtro vuelve a la página 1. Con 210
invitados, sin esto el scroll sería interminable.

---

## El menú del banquete

Cuatro tiempos: **entrada → plato fuerte → postre → bebida**.

### Configurarlo (botón "Menú" arriba)

Se abre un editor con siete listas: cada tiempo tiene su versión de adulto y su
versión infantil, salvo las bebidas, que son comunes.

| Lista                                | Para quién      |
| ------------------------------------ | --------------- |
| Entrada / Entrada infantil           | Adultos / Niños |
| Plato fuerte / Plato fuerte infantil | Adultos / Niños |
| Postre / Postre infantil             | Adultos / Niños |
| Bebidas                              | Todos           |

**Una lista vacía = esa pregunta no se hace.** Si los niños comen la misma
entrada que los adultos, deja vacía la infantil y no se les preguntará. Si no
vas a ofrecer postre, deja las dos listas de postre vacías.

Los **bebés no eligen nada** y no entran en ningún conteo.

### Lo que ve el invitado

Al marcar "Sí asistiré" aparece un bloque por cada persona de su grupo, con su
nombre. A quien esté marcado como Niño solo se le ofrecen las opciones
infantiles.

**Elegir es obligatorio.** No puede enviar su confirmación con algo pendiente:
sale el mensaje _"Falta elegir el menú de Ana López"_, la tarjeta de esa persona
se marca en rojo y los tiempos sin elegir llevan un asterisco.

### Cambiar el menú de alguien (botón "Menú" en su fila)

Para cuando te avisan por teléfono que prefieren el pescado. Abre el mismo
selector precargado con lo que ya había elegido.

A diferencia del invitado, **aquí no se exige completarlo**: puedes cambiar solo
lo de una persona y guardar.

### El conteo para el banquete

Debajo de las métricas aparece el desglose en vivo de los cuatro tiempos, con
cuántos pidieron cada opción y cuántos siguen sin elegir. El enlace
**"Hay elecciones pendientes — ver quiénes"** filtra la tabla para que puedas
perseguirlos.

Solo cuenta a quienes ya confirmaron que sí, e incluye a los acompañantes.

> **Nota sobre "Acceso":** la columna que antes se llamaba _Entrada_ ahora se
> llama **Acceso**, y significa "ya pasó por la puerta". Se renombró porque
> _entrada_ ya es el primer tiempo del menú.

---

## Todos los comandos

| Comando                          | Qué hace                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                    | Arranca el servidor de desarrollo en el 5173               |
| `npm run build`                  | Compila para producción (carpeta `dist/`)                  |
| `npm run preview`                | Sirve lo compilado, para revisar antes de desplegar        |
| `npm run verificar`              | Diagnostica la configuración de Firebase y avisa qué falta |
| `npm run sembrar`                | Crea los 8 invitados de prueba (borra los anteriores)      |
| `npm run limpiar-prueba`         | Lista los invitados de prueba                              |
| `npm run limpiar-prueba -- --si` | Los borra de verdad                                        |
| `npm run migrar -- --dry-run`    | Lee el Excel y reporta, **sin escribir nada**              |
| `npm run migrar`                 | Sube los 210 invitados reales a Firestore                  |
| `npm run links`                  | Genera `salida/links-rsvp.csv` con todos los links         |

---

## ¿Cuándo hay que republicar las reglas?

No en cada cambio. Solo cuando el cambio toca lo que las reglas vigilan.

| Cambio                                                      | ¿Republicar? |
| ----------------------------------------------------------- | ------------ |
| Campo nuevo que **solo los novios** escriben desde el panel | **No**       |
| Campo nuevo que **el invitado** escribe desde su link       | **Sí**       |
| Nuevo valor permitido (categoría, lista, confirmación)      | **Sí**       |
| Textos, colores, columnas de la tabla, contenido del CSV    | **No**       |
| Quitar un campo                                             | **No**       |
| **Añadir un tiempo al menú** (ej. un cuarto plato)          | **No**       |
| **Cambiar el correo de la cuenta de la puerta**             | **Sí**       |
| **Dar un permiso nuevo a la cuenta de la puerta**           | **Sí**       |

Lo del menú merece explicación: añadir tiempos **no** requiere tocar reglas
porque todos viven dentro de los campos `menu` y `menuAcompanantes`, que ya
están permitidos. Solo hay que añadir una entrada a `CURSOS` en
[`src/lib/menu.js`](../src/lib/menu.js) — el editor, el selector del invitado, los
conteos y el CSV se generan solos a partir de esa lista.

El motivo: `allow update: if esStaff()` es un permiso amplio, así que los novios
pueden escribir campos nuevos sin tocar nada. Pero el público está limitado a una
lista blanca de cuatro campos exactos:

```
['confirmacion', 'restricciones', 'mensaje', 'fechaConfirmacion']
```

Si se añade una pregunta nueva al formulario del invitado (por ejemplo
"¿necesitas transporte?"), hay que meterla en esa lista o su confirmación
fallará con _Missing or insufficient permissions_.

Lo mismo con los valores cerrados: `d.categoria in ['Adulto', 'Niño', 'Bebé']`
rechaza cualquier valor que no esté en la lista.

### Cómo comprobar que están bien publicadas

Sin abrir la app, desde la terminal (sustituye el ID por el de cualquier
invitado):

```bash
KEY=$(grep '^VITE_FIREBASE_API_KEY=' .env | cut -d= -f2)
BASE="https://firestore.googleapis.com/v1/projects/boda-llely-drix/databases/(default)/documents"

# Debe dar 200: el invitado puede abrir su link
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/invitados/PON_UN_ID?key=$KEY"

# Debe dar 403: nadie puede descargar la lista completa
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/invitados?key=$KEY"
```

Si el primero da 403, las reglas no están publicadas. Si el segundo da 200,
la lista de invitados está expuesta y hay que corregirlo ya.

### Publicarlas con un comando

Para no depender de copiar y pegar, puedes autorizar la CLI una sola vez **en tu
propia terminal** (abre el navegador para que entres con tu cuenta de Google):

```powershell
npx firebase-tools login
```

A partir de ahí, cada republicación es:

```powershell
npx firebase-tools deploy --only firestore:rules
```

Toma el contenido de [`firestore.rules`](../firestore.rules) directamente, así que
no hay riesgo de pegar una versión vieja.

---

## Problemas comunes

**"Missing or insufficient permissions" en la consola del navegador**
No has publicado las reglas, o publicaste una versión vieja. Copia
[`firestore.rules`](../firestore.rules) completo en Firebase Console → Firestore →
Reglas → Publicar.

**El botón "Agregar invitado" falla**
Mismo motivo: las reglas nuevas incluyen `allow create`. Si publicaste las
reglas antes de que existiera esa función, vuelve a publicarlas.

**La cámara del escáner no abre**
Necesita HTTPS o `localhost`. Desde el celular con una IP tipo
`192.168.0.39:5173` **no funciona nunca**, por seguridad del navegador. La
prueba real hay que hacerla ya desplegado en Vercel.

**"npm no se reconoce"**
Cierra la terminal y abre una nueva. El `Path` solo se lee al abrirla.

**El panel no muestra invitados**
Corre `npm run verificar`. Si dice que la colección tiene 0 documentos, te falta
`npm run sembrar` (prueba) o `npm run migrar` (real).

**El invitado no puede guardar su menú**
Las reglas publicadas son anteriores al menú. Republica
[`firestore.rules`](../firestore.rules): necesita `menu` y `menuAcompanantes` en la
lista blanca, y el bloque `match /configuracion/{documento}`.

**El escáner dice que no tiene permiso al marcar un acceso**
Las reglas publicadas son anteriores a la separación de roles, o el correo de la
cuenta no coincide con el de `firestore.rules`. Comprueba que el usuario que
inició sesión es exactamente `escaner@bodallelydrix.com`.

**La cuenta de la puerta puede borrar invitados**
Estás con las reglas viejas, donde cualquier sesión tenía permisos totales.
Republica [`firestore.rules`](../firestore.rules) — es el bloque `esNovios()`.

**El botón "Menú" no aparece en las filas**
No hay menú configurado todavía. Créalo con el botón **Menú** de arriba; en
cuanto haya al menos una opción, aparece la columna y el botón en cada fila.

**404 al recargar en /admin o /rsvp/... en Vercel**
Falta [`vercel.json`](../vercel.json) con el _rewrite_ a `index.html`, o el
despliegue es anterior a ese archivo. Vercel además cachea los 404: recarga con
`Ctrl + Shift + R`.
