import * as XLSX from "xlsx";

// Solo se auditan tiendas de Lima de estas cadenas.
const CADENAS_PERMITIDAS = ["PLAZA VEA", "VIVANDA"];

// Si el último incidente de inventario tiene alguno de estos submotivos, el
// elemento ya no está físicamente en la tienda (se perdió, lo retiró tienda
// o cliente sin ser una desinstalación formal): se excluye del catálogo.
const SUBMOTIVOS_YA_NO_EN_TIENDA = [
  "ELEMENTO EXTRAVIADO EN ZONA DE EXHIBICION",
  "RETIRADO POR PERSONAL DE TIENDA",
  "RETIRADO SIN MOTIVO Y/O AUTORIZACION",
  "ELEMENTO DESECHADO POR TIENDA",
  "ELEMENTO RETIRADO POR EL CLIENTE",
];

export interface ElementoParseado {
  tienda: string;
  cadena: string | null;
  ciudad: string | null;
  region: string | null;
  cliente: string | null;
  marca: string | null;
  campana: string | null;
  cod_campana: string | null;
  elemento: string | null;
  tipo_elemento: string | null;
  clasificacion: string | null;
  ubicacion: string | null;
  categoria: string | null;
  foto_instalacion: string | null;
  // Vencido = ya no está formalmente "Instalado" (la campaña venció u otro
  // estado) pero OUT 2 sigue vacío: sigue físicamente en tienda a la espera
  // de que lo desinstalen. Estos elementos usan un flujo de auditoría
  // simplificado (solo foto + observaciones, sin checklist de estado).
  es_vencido: boolean;
  submotivo_desinstalacion: string | null;
  // No instalado = la campaña está vigente pero IN 2 sigue vacío (nunca se
  // instaló en tienda). A diferencia de "vencido", SÍ usa el checklist
  // completo (el auditor confirma si lo encontró o sigue sin instalar),
  // solo se le agrega el motivo como aviso informativo.
  es_no_instalado: boolean;
  submotivo_no_instalado: string | null;
}

export interface ResultadoParseo {
  elementos: ElementoParseado[];
  totalFilasExcel: number;
  totalFilasInstalado: number;
  totalElementosVencidos: number;
  totalElementosNoInstalados: number;
  filasDescartadasSinTienda: number;
  filasDescartadasFueraDeLima: number;
  filasDescartadasCadenaNoPermitida: number;
  filasDescartadasDesinstaladas: number;
  filasDescartadasSubmotivoExcluido: number;
  filasDescartadasVencidoNoInstalado: number;
  valoresRegionEncontrados: string[];
  valoresCadenaEncontrados: string[];
  valoresVigenciaEncontrados: string[];
}

/**
 * Normaliza un texto para comparaciones tolerantes: quita tildes/diacríticos,
 * pasa a mayúsculas y recorta espacios. Se usa tanto para los ENCABEZADOS
 * del Excel (para encontrar la columna correcta aunque la tilde venga con
 * una codificación Unicode distinta) como para algunos VALORES (ej. "Lima"
 * vs "LIMA " vs "Lima ").
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita diacríticos (tildes, diéresis)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function limpiar(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : null;
}

/**
 * La columna FOTO INSTALACIÓN a veces trae varias URLs separadas por coma
 * (varias fotos del mismo elemento). Como la foto de referencia del
 * checklist solo puede mostrar una imagen, se toma la primera URL válida.
 */
function primeraUrl(valor: string | null): string | null {
  if (!valor) return null;
  const partes = valor
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return partes[0] ?? null;
}

/**
 * Dado el array de encabezados reales del Excel, construye una función que
 * devuelve el valor de una fila para un nombre de columna "esperado",
 * encontrando el encabezado real aunque tenga una tilde con codificación
 * distinta, mayúsculas/minúsculas distintas, o espacios extra.
 */
function crearLector(encabezadosReales: string[]) {
  const mapaNormalizado = new Map<string, string>();
  for (const encabezado of encabezadosReales) {
    mapaNormalizado.set(normalizar(encabezado), encabezado);
  }

  return function leer(
    fila: Record<string, unknown>,
    nombreEsperado: string
  ): string | null {
    const encabezadoReal = mapaNormalizado.get(normalizar(nombreEsperado));
    if (!encabezadoReal) return null;
    return limpiar(fila[encabezadoReal]);
  };
}

/**
 * Lee un archivo Excel (Consolidado de Quasar Report) y devuelve las filas
 * que deben auditarse: Lima, cadena permitida, no desinstalado (OUT 2
 * vacío) y sin un submotivo de inventario que indique que ya no está en
 * tienda. Ya NO se filtra por "STATUS INSTALACION = Instalado": entran
 * tanto elementos instalados como no instalados (IN 2 vacío), siempre que
 * la campaña siga vigente y el elemento no haya sido desinstalado.
 *
 * Se marcan dos flujos especiales, mutuamente excluyentes:
 * - es_vencido: la campaña venció pero el elemento sigue en tienda,
 *   pendiente de desinstalar (checklist simplificado).
 * - es_no_instalado: la campaña está vigente pero nunca se instaló en
 *   tienda (checklist completo + aviso informativo con el motivo).
 * Un elemento vencido Y no instalado a la vez se descarta por completo
 * (no debería auditarse en ninguno de los dos flujos).
 *
 * Todo el parseo ocurre en el navegador (SheetJS) — el archivo nunca se
 * sube a un servidor intermedio, solo el resultado ya filtrado se inserta
 * en Supabase.
 */
export async function parsearConsolidado(
  file: File
): Promise<ResultadoParseo> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const primeraHoja = workbook.SheetNames[0];
  const hoja = workbook.Sheets[primeraHoja];

  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: "",
  });

  // Encabezados reales de la primera fila (para armar el lector tolerante).
  const [encabezadosReales = []] = XLSX.utils.sheet_to_json<string[]>(hoja, {
    header: 1,
    range: 0,
  }) as unknown as string[][];

  const leer = crearLector(
    (encabezadosReales as unknown[]).map((h) => String(h ?? ""))
  );

  let filasDescartadasSinTienda = 0;
  let filasDescartadasFueraDeLima = 0;
  let filasDescartadasCadenaNoPermitida = 0;
  let filasDescartadasDesinstaladas = 0;
  let filasDescartadasSubmotivoExcluido = 0;
  let filasDescartadasVencidoNoInstalado = 0;

  // Solo informativo para el preview.
  const totalFilasInstalado = filas.filter(
    (fila) => normalizar(leer(fila, "STATUS INSTALACION") ?? "") === "INSTALADO"
  ).length;

  const elementos: ElementoParseado[] = [];
  const valoresRegion = new Set<string>();
  const valoresCadena = new Set<string>();
  const valoresVigencia = new Set<string>();

  for (const fila of filas) {
    const tienda = leer(fila, "TIENDA");
    const region = leer(fila, "REGIÓN");
    const cadena = leer(fila, "CADENA");
    const out2 = leer(fila, "OUT 2");
    const submotivoInventario = leer(fila, "Submotivo Inciden Inv");

    if (region) valoresRegion.add(region);
    if (cadena) valoresCadena.add(cadena);

    // La tienda es obligatoria: sin ella no se puede agrupar la auditoría.
    if (!tienda) {
      filasDescartadasSinTienda++;
      continue;
    }

    // Solo tiendas de Lima.
    if (normalizar(region ?? "") !== "LIMA") {
      filasDescartadasFueraDeLima++;
      continue;
    }

    // Solo las cadenas Plaza Vea y Vivanda.
    if (!cadena || !CADENAS_PERMITIDAS.includes(normalizar(cadena))) {
      filasDescartadasCadenaNoPermitida++;
      continue;
    }

    // Si OUT 2 tiene fecha, el elemento fue desinstalado: se excluye.
    if (out2) {
      filasDescartadasDesinstaladas++;
      continue;
    }

    // Si el submotivo de inventario indica que ya no está en tienda
    // (extraviado, retirado por tienda/cliente sin autorización, etc.),
    // se excluye aunque OUT 2 esté vacío.
    if (
      submotivoInventario &&
      SUBMOTIVOS_YA_NO_EN_TIENDA.includes(normalizar(submotivoInventario))
    ) {
      filasDescartadasSubmotivoExcluido++;
      continue;
    }

    // Vencido = la columna Vigencia indica que venció (ej. "Vencido",
    // "Vencida"), pero el elemento sigue en tienda (OUT 2 vacío). El
    // Submotivo Ult Inciden Desinstal es solo informativo: el motivo por
    // el que todavía no se ha desinstalado.
    const vigencia = leer(fila, "Vigencia");
    const esVencido = normalizar(vigencia ?? "").includes("VENC");
    const submotivoDesinstalacion = leer(fila, "Submotivo Ult Inciden Desinstal");
    if (vigencia) valoresVigencia.add(vigencia);

    // No instalado = IN 2 vacío: el elemento nunca se instaló en tienda,
    // independiente de lo que diga STATUS INSTALACION.
    const in2 = leer(fila, "IN 2");
    const esNoInstalado = !in2;
    const submotivoNoInstalado = leer(fila, "Submotivo Inciden Instal");

    // Un elemento vencido Y nunca instalado a la vez es un caso que no
    // debe auditarse en ninguno de los dos flujos: se descarta.
    if (esVencido && esNoInstalado) {
      filasDescartadasVencidoNoInstalado++;
      continue;
    }

    elementos.push({
      tienda,
      cadena,
      ciudad: leer(fila, "CIUDAD"),
      region,
      cliente: leer(fila, "CLIENTE"),
      marca: leer(fila, "MARCA"),
      campana: leer(fila, "CAMPAÑA"),
      cod_campana: leer(fila, "COD CAMPAÑA"),
      elemento: leer(fila, "ELEMENTO"),
      tipo_elemento: leer(fila, "TIPO DE ELEMENTO"),
      clasificacion: leer(fila, "CLASIFICACIÓN ELEMENTO"),
      ubicacion: leer(fila, "UBICACIÓN"),
      categoria: leer(fila, "CATEGORIA"),
      foto_instalacion: primeraUrl(leer(fila, "FOTO INSTALACIÓN")),
      es_vencido: esVencido,
      submotivo_desinstalacion: submotivoDesinstalacion,
      es_no_instalado: esNoInstalado,
      submotivo_no_instalado: esNoInstalado ? submotivoNoInstalado : null,
    });
  }

  return {
    elementos,
    totalFilasExcel: filas.length,
    totalFilasInstalado,
    totalElementosVencidos: elementos.filter((e) => e.es_vencido).length,
    totalElementosNoInstalados: elementos.filter((e) => e.es_no_instalado).length,
    filasDescartadasSinTienda,
    filasDescartadasFueraDeLima,
    filasDescartadasCadenaNoPermitida,
    filasDescartadasDesinstaladas,
    filasDescartadasSubmotivoExcluido,
    filasDescartadasVencidoNoInstalado,
    valoresRegionEncontrados: Array.from(valoresRegion).slice(0, 15),
    valoresCadenaEncontrados: Array.from(valoresCadena).slice(0, 15),
    valoresVigenciaEncontrados: Array.from(valoresVigencia).slice(0, 15),
  };
}
