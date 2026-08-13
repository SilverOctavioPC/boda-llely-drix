# Pendientes

Estado del proyecto y lo que falta. Actualizado al **11 de agosto de 2026**.

Para el uso diario mira [GUIA.md](GUIA.md); para la instalación,
[README.md](../README.md).

---

## Dónde estamos

**Todo lo construido funciona y está desplegado.**

|                      | Estado                                                         |
| -------------------- | -------------------------------------------------------------- |
| Código en GitHub     | `SilverOctavioPC/boda-llely-drix`, rama `main`, al día         |
| Sitio en producción  | https://boda-llely-drix.vercel.app                             |
| Firebase             | Proyecto `boda-llely-drix`, plan Spark (gratis), región `nam5` |
| Reglas de Firestore  | **Publicadas y verificadas** end-to-end                        |
| Invitados en la base | **11 de prueba** (la base se limpió y se resembró)             |
| Menú configurado     | Los 4 tiempos, con opciones de ejemplo para probar             |
| Perfiles de acceso   | Novios (todo) y Escáner (solo marcar accesos)                  |

Node está instalado en modo portable en
`C:\Users\CEJA\AppData\Local\nodejs-portable\`, ya en el `Path` de usuario. Si
una terminal dice _"npm no se reconoce"_, ábrela de nuevo.

Arrancar: `npm run dev` → http://localhost:5173

---

## Lo que falta, por orden

### 1. Completar el menú (5 minutos)

El menú tiene cuatro tiempos —entrada, plato fuerte, postre, bebida— pero solo
configuraste dos, de cuando el sistema tenía dos.

**Ahora mismo a los invitados no se les pregunta ni entrada ni postre.** Eso es
correcto por diseño (lista vacía = pregunta que no se hace), no un fallo. Si vas
a ofrecerlos, agrégalos con el botón **Menú** del panel.

Decide también si los niños llevan entrada y postre propios o comen lo mismo:
las listas infantiles vacías hacen que no se les pregunte.

### 2. Personalizar los textos del evento (2 minutos)

[`src/lib/evento.js`](../src/lib/evento.js) tiene cuatro campos en `'Por definir'`:

```js
fecha: 'Por definir',              // 'Sábado 14 de febrero de 2026'
hora: 'Por definir',
lugar: 'Por definir',
limiteConfirmacion: 'Por definir', // se muestra en la página del invitado
```

Mientras digan "Por definir", esas líneas no aparecen en la invitación.

### 3. Crear la cuenta de la puerta

Firebase Console → **Authentication → Users → Agregar usuario**:

```
escaner@bodallelydrix.com
```

Ponle una contraseña distinta de la de novios. Esa cuenta ya está limitada en
las reglas: puede ver la lista y marcar accesos, pero **no** puede editar, ni
crear, ni borrar invitados, ni tocar el menú. Al iniciar sesión va directa al
escáner; el panel le queda cerrado.

**Inicia sesión con ella una vez en el celular que vayan a usar en la puerta.**
La sesión se guarda en el navegador y no caduca, así que esa noche esa persona
solo abre el link y escanea, sin teclear nada.

Después de la boda, desactiva la cuenta desde la misma pantalla.

> Si cambias ese correo, cámbialo también en
> [`src/lib/roles.js`](../src/lib/roles.js) **y** en
> [`firestore.rules`](../firestore.rules), y republica las reglas.

### 4. Probar el escáner en el celular ⚠️

**Es lo único que no se puede probar en local y es lo que vas a usar en la
puerta.** La cámara del navegador exige HTTPS; en `192.168.x.x:5173` no funciona
nunca.

1. Entra desde el celular a https://boda-llely-drix.vercel.app/admin/scanner
2. Inicia sesión con `escaner@bodallelydrix.com` (la cuenta del paso anterior)
3. Concede el permiso de cámara
4. Escanea el QR de un invitado de prueba que ya confirmó y comprueba los tres
   resultados:

| Caso                                 | Debe salir                                    |
| ------------------------------------ | --------------------------------------------- |
| Confirmó y no ha entrado             | 🟢 Verde, con el número de personas del grupo |
| Escanear ese mismo QR otra vez       | 🟡 Ámbar, "Ya registrado"                     |
| Alguien que dijo No o está pendiente | 🔴 Rojo                                       |

Hazlo con el celular concreto que vayan a usar ese día, y con la batería y el
brillo como estarán en el evento.

### 5. Corregir nombres en el Excel (antes de migrar)

En **Lista Llely** hay ~15 filas sin nombre propio: `ESPOSA`, `ESPOSO`,
`GEMELAS`, `GEMELA .`, `PAREJA DE IVÁN`, `ESPOSA DE ALBERTO`, `AMIGA ALBERTO`,
`MAMA DE LA SRA. CARMEN`, `Hijo Marisol`, `ITZA ACOMPA`, `ILEANA MAMA`,
`NOVIO DE MARISOL BACHO`, `ESPOSO MARISOL AREDA`, `Tania / amiga`,
`PELANCHITO`.

Su link diría literalmente _"Hola, ESPOSA"_.

**Es más cómodo corregirlos en el Excel antes de migrar.** Después también se
puede desde el panel con _Editar_, pero si ya mandaste los links, cambiar el
nombre no cambia el link (eso está bien) — solo es más trabajo manual.

Otra opción: dejarlos fuera del Excel y sumarlos como **acompañantes** de la
persona a la que van pegados. Encaja mejor con el modelo, porque un acompañante
no necesita nombre ni link propio.

### 6. Migrar los 210 invitados reales

Solo cuando estés conforme con cómo funciona todo, porque **genera los links
definitivos** y a partir de ahí cambiarlos es un lío.

```powershell
npm run limpiar-prueba -- --si   # borra los 11 ficticios
npm run migrar -- --dry-run      # debe decir 106 Llely + 104 Drix, sin escribir
npm run migrar                   # sube los 210
npm run links                    # genera salida/links-rsvp.csv
```

Antes de `npm run links`, pon en el `.env` la URL real:

```
BASE_URL=https://boda-llely-drix.vercel.app
```

Si no, los links del CSV apuntarán a `localhost` y no le servirán a nadie.

El CSV trae una columna **Mensaje WhatsApp** ya redactada, lista para copiar y
pegar, y las columnas `Lista` y `Fila Excel` para distinguir a los **19 nombres
repetidos** (`joaquín pérez` ×3, `vicky` ×2, `manuel` ×2…), que son personas
distintas con links distintos.

`npm run migrar` se niega a correr si ya hay datos, para no duplicar.

### 7. Repasar antes del día

- Un invitado real abre su link, confirma y le sale el QR.
- El panel refleja su confirmación en tiempo real.
- El conteo del banquete cuadra con lo que le vas a pasar al salón.
- Descarga el CSV y compruébalo con calma.

---

## Ideas que quedaron en el aire

Ninguna es necesaria; se hablaron y no se hicieron.

**Menú obligatorio también en el servidor.** Hoy se valida en el navegador. Un
invitado con conocimientos técnicos podría confirmar sin elegir llamando a la
API. Hacerlo en las reglas obligaría a duplicar ahí toda la lógica de qué
opciones le tocan a cada quien.

**Firmar el QR.** El QR lleva el ID del invitado sin firma; quien tenga el link
de alguien puede reproducir su QR. La defensa real es `entradaRegistrada` (el
segundo escaneo sale en ámbar) más que el personal ve el nombre en pantalla.

---

## Cosas que conviene no olvidar

**No subir secretos.** `.env` y `serviceAccount.json` están en `.gitignore` y se
verificó que nunca entraron al historial. La cuenta de servicio da acceso total y
se salta las reglas.

**Cuándo republicar reglas.** No en cada cambio. Sí cuando el invitado tenga que
escribir un campo nuevo, o cuando añadas un valor permitido (categoría, lista).
La tabla completa está en [GUIA.md](GUIA.md).

Añadir tiempos al menú **no** requiere tocar reglas: basta con editar `CURSOS` en
[`src/lib/menu.js`](../src/lib/menu.js) y el resto se genera solo.

**Los links de prueba caducan.** Cada `npm run sembrar` borra los anteriores y
crea otros con IDs nuevos. Los de [GUIA.md](GUIA.md) corresponden a la última
siembra.

**Vercel despliega solo** con cada push a `main`.

**Git lo llevas tú.** Quedó acordado que Claude solo edita archivos y tú revisas
y subes.
