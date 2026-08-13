# Boda Llely & Drix — RSVP + control de acceso por QR

Sistema web para confirmar asistencia y controlar la entrada el día del evento.

- **`/rsvp/:invitadoId`** — página pública de confirmación (una por invitado).
- **`/admin`** — panel privado de los novios.
- **`/admin/scanner`** — escáner de QR para la puerta.

> 📋 **[PENDIENTES.md](docs/PENDIENTES.md)** — qué falta por hacer y en qué orden.
> **Empieza por aquí si retomas el proyecto.**
>
> 📖 **[GUIA.md](docs/GUIA.md)** — cómo arrancar el servidor, links de prueba,
> comandos y problemas comunes. Este README es solo la instalación inicial.

---

## ⚠️ Antes de nada: lo que dice el Excel real

Revisé `Invitados boda.xlsx` celda por celda. Dos cosas no coinciden con lo que
se asumió al planear el sistema, y conviene saberlas:

**1. El Excel tiene 3 hojas, no 2.** Además de `Lista Llely` (106 invitados) y
`Lista Drix` (104 invitados) hay una hoja `Confirmaciónes` con totales
calculados. Esos totales están **desactualizados**: suman 204 personas cuando
las filas con nombre son 210. El sistema ignora esa hoja y cuenta las filas
reales.

**2. Los acompañantes están escritos de tres formas incompatibles.** El patrón
`"Karen Flores +1"` que se usó como ejemplo aparece **solo en 3 filas de todo el
archivo**. Los demás acompañantes están así:

| Cómo aparece                               | Ejemplo                                                   | Dónde            |
| ------------------------------------------ | --------------------------------------------------------- | ---------------- |
| `Nombre +1`                                | `Karen Flores +1`                                         | Drix, 3 filas    |
| El mismo nombre repetido en filas seguidas | `Joaquín Pérez` ×3 (Hombre / Mujer / Niño 8 años)         | Drix, ~20 filas  |
| Un parentesco en vez de un nombre          | `ESPOSA`, `PAREJA DE IVÁN`, `Hijo Marisol`, `ITZA ACOMPA` | Llely, ~15 filas |

Esto crea una trampa: agrupar o "deduplicar por nombre único" **borraría
acompañantes**. La familia de `Joaquín Pérez` pasaría de 3 personas a 1.

**Decisión tomada (acordada con los novios):** se respeta la columna NOMBRE tal
cual. **Cada fila del Excel = un invitado = un link propio.** No se agrupa, no se
deduplica, no se cambian mayúsculas ni acentos. 210 filas → 210 invitados.

### Consecuencias prácticas que hay que atender a mano

- **~15 invitados de Lista Llely no tienen nombre propio** (`ESPOSA`, `ESPOSO`,
  `GEMELAS`, `PELANCHITO`, `AMIGA ALBERTO`…). Su link dirá literalmente
  _"Hola, ESPOSA"_. **Recomendación:** corrijan esos nombres en el Excel _antes_
  de correr la migración; después de generar los links, cambiarlos implica
  regenerar.
- **Hay nombres repetidos** entre personas distintas (`VICKY` ×2, `ROBERTO` ×2,
  `MANUEL` ×2, `LILIAN` en ambas listas). Cada una recibe un link diferente. El
  CSV de salida incluye las columnas `Lista` y `Fila Excel` para saber cuál es
  cuál al momento de mandarlos por WhatsApp.
- **La columna Sexo tiene errores** en el origen (`Alejandra Rivas → Hombre`,
  `Edgar Rivas → Mujer`, `MICHELLE → Hombre`). Se importa tal cual; solo afecta
  a los conteos por sexo, no al funcionamiento.
- **5 filas de Drix no tienen Sexo** (`Manuel Rivera`, `Paula Aragon`,
  `Mónica CA`, `Liz CA`, `Mariano Pérez`). Se importan con `sexo: null`.
- La columna CONFIRMACIÓN del Excel trae respuestas sueltas en 5 filas. **No se
  importan como confirmación**: todos arrancan en `Pendiente` para que cada quien
  responda desde su link. El valor original se guarda en `confirmacionExcel`
  por si lo quieren consultar.

---

## Requisitos

**Node.js ya está instalado** — v24.19.0 con npm 11.17.0.

La instalación normal por `winget` requiere permisos de administrador y el
sistema canceló la elevación, así que se instaló la **versión portable** en:

```
C:\Users\CEJA\AppData\Local\nodejs-portable\node-v24.19.0-win-x64
```

Esa ruta ya se agregó al `Path` de usuario, así que en **una terminal nueva**
`node` y `npm` funcionan directamente:

```powershell
node --version   # v24.19.0
npm --version    # 11.17.0
```

> Si algún día quieres la instalación oficial en `Archivos de programa`, corre
> `winget install OpenJS.NodeJS.LTS` desde una terminal **abierta como
> administrador** y luego borra la carpeta portable.

---

## Puesta en marcha

### 1. Instalar dependencias

```powershell
cd c:\Users\CEJA\Desktop\boda-llely-drix
npm install
```

### 2. Crear el proyecto en Firebase

1. [Firebase Console](https://console.firebase.google.com/) → **Agregar proyecto**.
2. **Firestore Database** → Crear base de datos → modo producción.
3. **Authentication** → Sign-in method → habilitar **Correo/contraseña**.
4. En **Authentication → Users**, crea a mano la cuenta de cada novio.
   No hay registro público: quien no esté en esa lista no entra al panel.
5. **Configuración del proyecto → Tus apps → Web** → copia el objeto de config.

### 3. Configurar variables

```powershell
Copy-Item .env.example .env
```

Rellena `.env` con los datos del paso anterior.

> Las claves `VITE_*` quedan visibles en el JavaScript público del sitio. Eso es
> normal en Firebase y no es una fuga: la seguridad real vive en
> `firestore.rules`, no en ocultar la `apiKey`.

### 4. Publicar las reglas de seguridad

Pon tu project ID en `.firebaserc` (reemplaza `PON-AQUI-TU-PROJECT-ID`) y
despliega:

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

O, si prefieres no usar la CLI: copia el contenido de `firestore.rules` en
**Firebase Console → Firestore → Reglas** y publica.

**Hazlo antes de migrar.** Si dejas la base en modo de prueba, cualquiera puede
descargar la lista completa de invitados.

### 4b. Comprobar que todo quedó bien

```powershell
npm run verificar
```

Revisa el `.env`, la cuenta de servicio y la conexión real a Firestore, y dice
qué falta. Detecta el error más común: que la app web y la cuenta de servicio
apunten a **proyectos distintos**.

### 5. Datos de prueba (antes de tocar la lista real)

Para trabajar las tres pantallas sin cargar todavía a los 210 invitados:

```powershell
npm run sembrar
```

Crea 11 invitados **ficticios** (nombres inventados, ninguno sale del Excel) que
cubren todos los estados de la interfaz, e imprime el link de RSVP de cada uno
listo para abrir. Suman **15 personas**, porque dos llevan acompañantes:

| Invitado de prueba | Para probar                                       |
| ------------------ | ------------------------------------------------- |
| Valentina Ruiz     | Pendiente — formulario de confirmación            |
| Rodrigo Salas      | Pendiente — flujo de "No podré"                   |
| Camila Ferrer      | Ya dijo SÍ — muestra QR y restricciones           |
| Tomás Iriarte      | Ya dijo SÍ — escanea su QR: **verde**             |
| Renata Ocampo      | Niña con edad — cómo se ve en la tabla            |
| Bruno Sepúlveda    | Bebé — cuenta aparte y sin menú                   |
| Patricia Alcázar   | Grupo de 4 con nombres — un solo QR para todos    |
| Gerardo Pineda     | Acompañante sin nombre — el caso "2 lugares"      |
| Ignacio Bustos     | Ya entró — al escanear: **ámbar "Ya registrado"** |
| Lucía Ordóñez      | Dijo NO — al escanear: **rojo "No confirmó"**     |
| Esteban Quiroga    | Pendiente — al escanear: **rojo "No confirmó"**   |

Todos llevan `esPrueba: true`, así que se borran limpiamente sin tocar nada más:

```powershell
npm run limpiar-prueba          # lista lo que borraría
npm run limpiar-prueba -- --si  # borra de verdad
```

`npm run migrar` se niega a correr si detecta datos de prueba y te dice que los
limpies primero.

### 6. Migrar los invitados

Descarga la clave de administrador (**Configuración del proyecto → Cuentas de
servicio → Generar nueva clave privada**), guárdala como `serviceAccount.json`
en la raíz del proyecto — ya está en `.gitignore`, **nunca la subas a git**.

Primero, un ensayo que no escribe nada:

```powershell
npm run migrar -- --dry-run
```

Revisa que diga **106 de Llely y 104 de Drix**. Si cuadra:

```powershell
npm run migrar
```

El script se niega a correr dos veces si ya hay datos, para no duplicar
invitados con links nuevos.

### 7. Generar los links para WhatsApp

```powershell
npm run links
```

Genera `salida/links-rsvp.csv` con `Nombre | Link RSVP | Lista | Fila Excel | …`
y una columna **Mensaje WhatsApp** ya redactada, lista para copiar y pegar.

### 8. Desarrollo y despliegue

```powershell
npm run dev     # http://localhost:5173
npm run build
```

En **Vercel**: importa el repo, framework _Vite_, y carga las mismas variables
`VITE_*` en Settings → Environment Variables. Después del primer despliegue,
pon la URL real en `BASE_URL` del `.env` y vuelve a correr `npm run links`.

Personaliza fecha, lugar y nombres en [`src/lib/evento.js`](src/lib/evento.js).

---

## Modelo de datos (`invitados`)

```js
{
  nombre: string,              // tal cual el Excel, sin normalizar
  grupo: 'Llely' | 'Drix',
  sexo: string | null,
  edad: string | null,         // '3 años', '10 años'…
  mesa: string | null,

  confirmacion: 'Si' | 'No' | 'Pendiente',
  confirmacionExcel: string | null,   // valor original, solo referencia
  posibleAsistencia: string | null,
  saveTheDate: string | null,

  restricciones: string | null,
  mensaje: string | null,
  fechaConfirmacion: timestamp | null,

  entradaRegistrada: boolean,
  fechaEntrada: timestamp | null,

  // Acompañantes: lugares que cuelgan del titular. No son documentos propios,
  // no tienen link ni QR. El QR del titular vale por todo el grupo.
  // Nombre, sexo y edad son opcionales.
  acompanantes: {
    adultos: [{ nombre: 'Ana López', sexo: 'Mujer' }],
    ninos:   [{ nombre: 'Leo', sexo: 'Hombre', edad: '6 años' }]
  },

  // Menú elegido. Los ids apuntan a las opciones de configuracion/menu.
  menu: { entrada: 'e1', plato: 'p2', postre: 'd1', bebida: 'b1' },

  // Una entrada por acompañante, en el mismo orden: primero adultos, luego
  // niños. Va SEPARADO de `acompanantes` a propósito — ver Seguridad.
  menuAcompanantes: [{ entrada: 'e1', plato: 'p1', postre: 'd1', bebida: 'b1' }],

  origen: { hoja, fila, numero }   // trazabilidad al Excel
}
```

Colección `configuracion`, documento `menu`:

```js
{
  entradas: [{ id: 'e1', nombre: 'Crema de elote' }],
  entradasNinos: [],           // vacío = a los niños no se les pregunta
  platos:   [{ id: 'p1', nombre: 'Pollo' }, { id: 'p2', nombre: 'Res' }],
  platosNinos: [{ id: 'pn', nombre: 'Nuggets' }],
  postres:  [{ id: 'd1', nombre: 'Pastel' }],
  postresNinos: [{ id: 'dn', nombre: 'Helado' }],
  bebidas:  [{ id: 'b1', nombre: 'Vino tinto' }]   // comunes a todos
}
```

---

## Seguridad: qué protege y qué no

**Sí protege:**

- Los IDs los genera Firestore (20 caracteres aleatorios). No son secuenciales,
  así que no se pueden adivinar ni enumerar los links de otros.
- `allow list` está **bloqueado** para el público. Esta es la línea clave: sin
  ella, el `get` público dejaría descargar la colección entera.
- Un invitado solo puede modificar `confirmacion`, `restricciones`, `mensaje` y
  `fechaConfirmacion`. No puede tocar su nombre ni marcarse la entrada.
- Crear y borrar invitados exige sesión iniciada, y el alta valida nombre,
  grupo y confirmación antes de aceptarse.
- **Dos perfiles con permisos distintos**, por mínimo privilegio:

  |                  | Novios | Escáner (puerta) |
  | ---------------- | ------ | ---------------- |
  | Ver la lista     | Sí     | Sí               |
  | Marcar accesos   | Sí     | Sí               |
  | Editar invitados | Sí     | **No**           |
  | Crear y borrar   | Sí     | **No**           |
  | Cambiar el menú  | Sí     | **No**           |

  El rol se decide por el correo de la cuenta (`escaner@bodallelydrix.com`),
  definido a la vez en `firestore.rules` y en
  [`src/lib/roles.js`](src/lib/roles.js). Si cambias uno, cambia el otro.
  La app oculta lo que esa cuenta no puede hacer, pero **quien lo impide de
  verdad son las reglas**, no el navegador.

- **Un invitado no puede regalarse lugares de más.** Sus elecciones de menú van
  en `menuAcompanantes`, una lista separada de `acompanantes`. Si estuvieran
  dentro, para dejarle elegir habría que darle permiso de escritura sobre
  `acompanantes` y podría editar su link para sumarse acompañantes. La regla
  `menuValido()` además rechaza cualquier lista de menús más larga que sus
  acompañantes reales.
- `/admin` y `/admin/scanner` exigen sesión de Firebase Auth.
- El registro de entrada usa una **transacción**, así que dos celulares
  escaneando a la vez no descuadran el conteo.

**No protege (y conviene tenerlo claro):**

- **La obligatoriedad del menú se valida en el navegador, no en las reglas.**
  Alguien con conocimientos técnicos podría confirmar sin elegir llamando a la
  API directamente. Replicarlo en las reglas obligaría a duplicar ahí toda la
  lógica de qué opciones le tocan a cada persona, y rompería la edición desde el
  panel. El panel muestra igualmente quién tiene algo pendiente.

- **El QR contiene solo el ID del invitado, sin firma.** Quien tenga el link de
  alguien puede reproducir su QR. La defensa real es `entradaRegistrada`: el
  segundo escaneo del mismo pase sale en **ámbar "Ya registrado"** y el personal
  ve el nombre en pantalla para verificar contra la persona que tiene enfrente.
- **Quien tenga el link de otro puede confirmar por él.** Es el mismo modelo de
  confianza que un RSVP por WhatsApp. Si les preocupa, revisen el panel antes
  del evento.
- Cualquiera con un ID válido puede leer ese documento (nombre, mensaje,
  restricciones). Es necesario para que la página de RSVP funcione sin login.

---

## Estado de verificación

### Estructura del código

```
src/
  lib/
    firebase.js       app + Firestore (sin Auth, ver nota de bundles)
    auth.js           Firebase Auth — solo lo importa la zona privada
    acompanantes.js   grupos: lectura tolerante, conteos, nombres
    menu.js           los 4 tiempos, opciones por comensal, conteos
    evento.js         nombres, fecha y lugar — edítalo para personalizar
  components/
    Modal.jsx             diálogo accesible (Escape, foco, scroll)
    FormularioInvitado.jsx  alta y edición, con contadores de acompañantes
    ConfigMenu.jsx        editor de las listas del menú
    SelectorMenu.jsx      elección por persona (lo usan invitado y panel)
    RutaProtegida.jsx     redirige a /login sin sesión
  pages/
    Rsvp.jsx      pública: confirmar, elegir menú, QR
    Login.jsx     acceso de los novios
    Admin.jsx     panel
    Scanner.jsx   lectura de QR en la puerta
  ZonaPrivada.jsx  agrupa todo lo privado en un chunk aparte
```

Para **añadir un tiempo al menú** (o quitarlo) basta con editar la lista
`CURSOS` en `src/lib/menu.js`: el editor, el selector, los conteos y el CSV se
generan a partir de ahí.

### Comprobado en ejecución ✅

- **`npm install`** — 420 paquetes, sin conflictos de versiones.
- **`npm run build`** — compila limpio (84 módulos, ~3 s).
- **`npm run dev`** — el servidor levanta y responde HTTP 200.
- **Lectura del Excel** (`npm run migrar -- --dry-run`) — lee **210 invitados:
  106 de Llely y 104 de Drix**, exactamente lo previsto. Los nombres salen
  verbatim, incluidos los dobles espacios (`JAVIER  C.`).
- **Sintaxis de los 6 scripts de Node.**
- **Separación de bundles** — verificado que el SDK de Firebase Auth ya **no**
  viaja en el chunk público.
- **Reglas de Firestore, de punta a punta** — con una sesión real de novios:
  login OK, listar con sesión OK, crear invitado con acompañantes OK. Y sin
  sesión: leer un invitado por su ID 200, listar la colección 403, crear 403.
- **Lógica del menú** — 20 comprobaciones sobre `src/lib/menu.js`: los cuatro
  tiempos en orden, menú infantil separado, bebidas compartidas, bebés sin
  elección, listas vacías que no se preguntan, conteos mezclando adulto e
  infantil, y compatibilidad con documentos guardados antes de que existiera
  el postre.
- **Despliegue en Vercel** — `/`, `/admin`, `/login`, `/admin/scanner` y
  `/rsvp/:id` responden 200 y sirven la app (hizo falta `vercel.json` con el
  _rewrite_ a `index.html`; sin él, recargar en cualquier ruta daba 404).

El _dry-run_ también detectó **19 nombres repetidos** entre personas distintas
(`joaquín pérez` ×3, `esposa` ×2, `karen flores +1` ×2, `vicky` ×2…). Cada uno
recibe su propio link; usa `Lista` + `Fila Excel` del CSV para saber cuál es cuál.

### Tamaño del bundle

La página de RSVP se abre desde WhatsApp con datos móviles, así que el código
está partido en tres:

| Chunk         | Tamaño      | Quién lo descarga         |
| ------------- | ----------- | ------------------------- |
| `index`       | 144 kB gzip | Todos (página de RSVP)    |
| `ZonaPrivada` | 28 kB gzip  | Solo al entrar a `/admin` |
| `Scanner`     | 101 kB gzip | Solo al abrir el escáner  |

Antes de separarlo, la página pública pesaba **272 kB gzip**: los invitados
descargaban la librería del escáner y el módulo de autenticación sin usarlos.

### Sin comprobar todavía ⚠️

- **Que un invitado pueda guardar su menú.** Requiere publicar la versión actual
  de `firestore.rules` (la que añade `menu` y `menuAcompanantes` a la lista
  blanca). Hasta entonces, confirmar con menú falla con _permission denied_.
- **La cámara del escáner en un celular real.** Solo se puede probar ya
  desplegado: el navegador exige HTTPS y en `192.168.x.x` nunca funciona.
- **La migración real de los 210 invitados.** Se probó a fondo la lectura del
  Excel (`--dry-run`), no la escritura en Firestore.

**Prueben el escáner antes del día del evento**, con un QR real y en el celular
que van a usar en la puerta. La cámara del navegador exige HTTPS (Vercel lo da)
o `localhost`; en una IP local tipo `192.168.x.x` **no funciona**.
