# Test 9 Ejes Colombia

Herramienta interactiva para que ciudadanos colombianos identifiquen cuál líder político a las **Elecciones Presidenciales 2026** se alinea mejor con sus valores y propuestas, a través de un sistema evaluado de **9 ejes ideológicos y de política pública**.

---

## Características

- **Test de Afinidad por 9 Ejes**: Cuestionario de 50 preguntas precisas basadas en los debates coyunturales del país (economía, seguridad, ambiente, etc.).
- **Algoritmo N-Dimensional**: El sistema calcula la distancia euclidiana entre el perfil ideológico del usuario y el de cada candidato en los 9 ejes, generando un porcentaje de afinidad preciso.
- **Generación Automática de Perfiles**: Al terminar, el sistema emite una frase personalizada con base a las respuestas (Ej: "Tecnócrata Institucional Progresista", "Uribista / Conservador Punitivo", etc.) completamente impulsada de forma local sin coste de API.
- **Ranking Personalizado**: Al finalizar el test, ranking de afinidad con líderes políticos ordenados de mayor a menor convergencia.
- **Diccionario de Ejes Extendido**: Explicación interactiva desplegable donde se exponen las dicotomías políticas colombianas analizadas.
- **Perfiles de Líderes**: Visualización de la posición de cada líder en los 9 ejes, con comparación directa frente a las respuestas del usuario, junto con sus perfiles biográficos.
- **Guardado y Compartir en Alta Resolución**: El test genera una tarjeta ideológica visual completa para compartir fácilmente y debatir con datos, soportando captura instantánea y descarga.
- **Persistencia de datos Segura**: Las tendencias y comentarios voluntarios se guardan de forma anónima y transaccional en PostgreSQL vía Supabase RPC Functions, para propósitos estadísticos sin almacenar datos personales.
- **Modo Oscuro Glassmorphism**: Interfaz estética, ágil, premium y moderna adaptada prioritariamente para uso responsivo en dispositivos móviles.

---

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript Vanilla
- **Base de datos / Backend**: [Supabase](https://supabase.com) (PostgreSQL) — REST API e invocación RPC directa con `fetch()`
- **Captura de imagen nativa**: [html2canvas](https://html2canvas.hertzen.com/)
- **Iconografía**: SVG Inline puro escalable
- **Fuentes**: Google Fonts (Inter)

---

## Estructura de Archivos

```text
Test_9ejes/
├── index.html                  # Estructura de componentes 
├── app.js                      # Centralización de la Lógica y cálculos SVG
├── style.css                   # Motor de diseño y Dark Mode Variables
├── server.js                   # Servidor simple para evitar CORS localmente
├── README.md                   # Documentación actual
├── supabase_*.sql              # Archivos de la estructura y migración de BD
├── Candidatos/                 # Carpeta de las fotos de los 15 líderes evaluados
├── Partidos/                   # Logos partidistas en la pantalla de líder
├── Perfil/                     # Gráficos e ilustraciones contextuales
└── Íconos/                     # Imágenes estructurales para compatibilidad y opengraph
```

---

## Los 9 Ejes Ideológicos (Contexto Colombiano)

| # | Eje | Polo Negativo → Polo Positivo | Descripción Breve |
|---|---|---|---|
| 1 | **Económico** | Intervencionismo → Libre Mercado | Rol del Estado sobre empresas y libertad financiera empresarial. |
| 2 | **Seguridad** | Progresismo → Punitivismo | Paz Total y prevención del delito vs. Combate armado, cárcel y mano dura. |
| 3 | **Moral** | Neutralidad → Moralidad | Estado y laicidad liberal objetiva frente la protección legal de los valores tradicionales/familiares |
| 4 | **Cultural** | Progresismo → Conservadurismo | Apropiación y fomento de diversidades vs Protección de costumbres e identidad simbólica. |
| 5 | **Ambiental** | Ambientalismo → No-Ambientalismo | Detención estricta de explotación minero-energética vs Fortalecimiento de exportación matriz. |
| 6 | **Internacional** | Soberanismo → Cosmopolitismo | Nacionalismo y aislamiento local autárquico vs TLCs e Inversiones Extranjeras y alianzas geopolíticas profundas. |
| 7 | **Liderazgo** | Dogmatismo → Pragmatismo | Movilización fuerte por el líder visceral irreductible vs Burocracia, coalición y acuerdos silenciosos e institucionales. |
| 8 | **Institucional** | Institucionalidad → Ruptura | Mantenimiento del modelo constitucional del 91 y cortes vs Necesidad de asamblea constituyente o cambio del régimen. |
| 9 | **Política Social** | Universalismo → Focalización | Prestación directa obligatoria del estado social vs Entrega condicionada focalizada subsidiada por medio de privados y Sisbén. |

---

## Base de Datos (Supabase)

La aplicación carga a los líderes e inserciones dinámicamente. Nada está *hardcodeado* además de la estética estructural. Incluye las siguientes tablas en su esquema principal de PostgreSQL:
- `axes`, `questions`, `candidates`, `candidate_positions`
- Las interacciones de quienes toman el test se inyectan silenciosamente usando el store procedure en Supabase: `submit_quiz_session()` que graba score final general, los 9 ejes puntuales y retroalimentación dejada sin tomar registros sensibles.

> Para re-crear la base de datos, ejecutar los archivos de migración incluidos en el SQL Editor del dashboard de Supabase garantizando los permisos del esquema público y Policy de RLS.

---

## Instalación y Uso Local

La herramienta funciona excelente mediante cualquier servidor de HTML estándar dado que su arquitectura de red llama a las API remotamente por Javascript en el propio cliente.

**Node.js / Express**

```bash
git clone https://github.com/Juansotag/Test_9ejes.git
cd Test_9ejes

npm install
npm start
```
Se servirá en tu local en `http://localhost:3000`.

---

## Créditos y Consideraciones
* Esta aplicación está diseñada sin ánimos de lucro ni propaganda de candidaturas con el único fin de educar electoralmente sobre los diferentes enfoques multidimensionales del escenario socioeconómico colombiano de cara alrededor de los debates presidenciales del 2026.
* Creada y optimizada iterativamente por **Juan Diego Sotelo Aguilar**.

## Licencia

**Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)**
- **Atribución**: dar crédito explícito.
- **No Comercial**: prohibido su lucro financiero.
