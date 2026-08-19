import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { DatosReporteTienda, ElementoReporte } from "@/lib/utils/reporte";
import type { ElementoExtra } from "@/lib/utils/auditor";

// Evita que react-pdf parta palabras a la mitad con guión al ajustar líneas.
Font.registerHyphenationCallback((word) => [word]);

const NAVY = "#1D3461";
const GRIS_TEXTO = "#374151";
const GRIS_CLARO = "#9CA3AF";
const GRIS_FONDO = "#F7F8FA";
const VERDE = "#16A34A";
const VERDE_FONDO = "#DCFCE7";
const ROJO = "#DC2626";
const ROJO_FONDO = "#FEE2E2";
const AMBAR = "#D97706";
const AMBAR_FONDO = "#FEF3C7";
const AZUL = "#2563EB";
const AZUL_FONDO = "#DBEAFE";

function colorEstado(estado: string): [string, string] {
  if (estado === "Instalado-OK") return [VERDE, VERDE_FONDO];
  if (estado === "Faltante" || estado === "Retirado") return [ROJO, ROJO_FONDO];
  return [AMBAR, AMBAR_FONDO];
}

const styles = StyleSheet.create({
  page: {
    fontSize: 9,
    color: GRIS_TEXTO,
    paddingBottom: "18mm",
  },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: "18mm",
    paddingVertical: "6mm",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitulo: { color: "#FFFFFF", fontSize: 13, fontWeight: 700 },
  headerSubtitulo: { color: "#BFD1E8", fontSize: 9, marginTop: 2 },
  headerDerecha: { color: "#FFFFFF", fontSize: 8, textAlign: "right" },
  headerDerechaSub: { color: "#BFD1E8", fontSize: 8, textAlign: "right", marginTop: 2 },
  body: { paddingHorizontal: "18mm", paddingTop: "10mm" },
  footer: {
    position: "absolute",
    bottom: "8mm",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7,
    color: GRIS_CLARO,
  },

  // Portada
  tiendaNombre: { fontSize: 20, fontWeight: 700, color: GRIS_TEXTO },
  tiendaSub: { fontSize: 11, color: GRIS_CLARO, marginTop: 3, marginBottom: 10 },
  infoFila: { flexDirection: "row", marginBottom: 5 },
  infoLabel: { width: "45mm", fontSize: 9, color: GRIS_CLARO },
  infoValor: { fontSize: 9, fontWeight: 700, color: GRIS_TEXTO },
  seccionTitulo: { fontSize: 12, fontWeight: 700, color: GRIS_TEXTO, marginTop: 14, marginBottom: 8 },
  barraFila: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barraLabel: { width: "40mm", fontSize: 9 },
  barraPistaWrap: { flex: 1, marginHorizontal: 6 },
  barraPista: { height: "4mm", backgroundColor: GRIS_FONDO, borderRadius: 2 },
  barraRelleno: { height: "4mm", borderRadius: 2, position: "absolute", top: 0, left: 0 },
  barraPct: { width: "18mm", fontSize: 9, fontWeight: 700, textAlign: "right" },
  clasifRow: { flexDirection: "row", marginTop: 4 },
  clasifBox: { flex: 1, backgroundColor: GRIS_FONDO, borderRadius: 3, padding: 8, marginRight: 6, alignItems: "center" },
  clasifNum: { fontSize: 18, fontWeight: 700, color: NAVY },
  clasifLabel: { fontSize: 8, color: GRIS_TEXTO, marginTop: 2 },

  // Fichas
  claseHeader: { fontSize: 11, fontWeight: 700, color: NAVY, marginTop: 6, marginBottom: 4 },
  claseLinea: { borderBottomWidth: 1, borderBottomColor: NAVY, marginBottom: 8 },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  foto: { width: "32mm", height: "32mm", borderRadius: 2, objectFit: "cover" },
  fotoVacia: {
    width: "32mm",
    height: "32mm",
    borderRadius: 2,
    backgroundColor: GRIS_FONDO,
    alignItems: "center",
    justifyContent: "center",
  },
  fotoVaciaTexto: { fontSize: 7, color: GRIS_CLARO, textAlign: "center" },
  cardDerecha: { flex: 1, marginLeft: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitulo: { fontSize: 11, fontWeight: 700, color: GRIS_TEXTO, flex: 1, marginRight: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTexto: { fontSize: 7, fontWeight: 700 },
  cardSub: { fontSize: 8, color: GRIS_CLARO, marginTop: 3 },
  cardMeta: { fontSize: 7.5, color: GRIS_TEXTO, marginTop: 3 },
  cardObs: { fontSize: 7.5, fontStyle: "italic", color: GRIS_TEXTO, marginTop: 3 },
  cardFooter: { fontSize: 6.5, color: GRIS_CLARO, marginTop: 6 },
});

function Header({ tienda, fecha }: { tienda: string; fecha: string }) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.headerTitulo}>Reporte de Auditoría de Tienda</Text>
        <Text style={styles.headerSubtitulo}>Quasar BTL</Text>
      </View>
      <View>
        <Text style={styles.headerDerecha}>{tienda}</Text>
        <Text style={styles.headerDerechaSub}>{fecha}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <Text
      style={styles.footer}
      fixed
      render={({ pageNumber }) => `Quasar BTL · Auditoría de Tienda · Página ${pageNumber}`}
    />
  );
}

function Portada({ datos }: { datos: DatosReporteTienda }) {
  const conteo: Record<string, number> = {};
  for (const e of datos.elementos) {
    conteo[e.estado_actual] = (conteo[e.estado_actual] || 0) + 1;
  }
  const conteoClasif: Record<string, number> = {};
  for (const e of datos.elementos) {
    conteoClasif[e.clasificacion] = (conteoClasif[e.clasificacion] || 0) + 1;
  }
  if (datos.elementosExtra.length > 0) {
    conteoClasif["No listados"] = datos.elementosExtra.length;
  }
  const total = datos.totalElementos || 1;

  return (
    <>
      <Text style={styles.tiendaNombre}>{datos.tienda}</Text>
      <Text style={styles.tiendaSub}>
        {[datos.cadena, datos.ciudad].filter(Boolean).join(" · ")}
      </Text>

      <View style={styles.infoFila}>
        <Text style={styles.infoLabel}>Auditor(es)</Text>
        <Text style={styles.infoValor}>{datos.auditores.join(", ") || "—"}</Text>
      </View>
      <View style={styles.infoFila}>
        <Text style={styles.infoLabel}>Fecha del reporte</Text>
        <Text style={styles.infoValor}>
          {datos.fechaReporte
            ? new Date(datos.fechaReporte).toLocaleDateString("es-PE")
            : "—"}
        </Text>
      </View>
      <View style={styles.infoFila}>
        <Text style={styles.infoLabel}>Total de elementos auditados</Text>
        <Text style={styles.infoValor}>
          {datos.totalElementos}
          {datos.elementosExtra.length > 0
            ? ` (+ ${datos.elementosExtra.length} no listados)`
            : ""}
        </Text>
      </View>

      <Text style={styles.seccionTitulo}>Resultado de la auditoría</Text>
      {Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .map(([estado, n]) => {
          const [colorTxt, colorFondo] = colorEstado(estado);
          const pct = n / total;
          return (
            <View key={estado} style={styles.barraFila}>
              <Text style={styles.barraLabel}>{estado}</Text>
              <View style={styles.barraPistaWrap}>
                <View style={styles.barraPista} />
                <View
                  style={[
                    styles.barraRelleno,
                    { width: `${Math.max(pct * 100, 4)}%`, backgroundColor: colorTxt },
                  ]}
                />
              </View>
              <Text style={[styles.barraPct, { color: colorTxt }]}>
                {n} ({Math.round(pct * 100)}%)
              </Text>
            </View>
          );
        })}

      <Text style={styles.seccionTitulo}>Elementos por clasificación</Text>
      <View style={styles.clasifRow}>
        {Object.entries(conteoClasif).map(([clas, n]) => (
          <View key={clas} style={styles.clasifBox}>
            <Text style={styles.clasifNum}>{n}</Text>
            <Text style={styles.clasifLabel}>{clas}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function FichaElemento({ e }: { e: ElementoReporte }) {
  const [colorTxt, colorFondo] = colorEstado(e.estado_actual);
  return (
    <View style={styles.card} wrap={false}>
      {e.foto_url ? (
        <Image style={styles.foto} src={e.foto_url} />
      ) : (
        <View style={styles.fotoVacia}>
          <Text style={styles.fotoVaciaTexto}>Sin foto</Text>
        </View>
      )}
      <View style={styles.cardDerecha}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitulo}>{e.tipo}</Text>
          <View style={[styles.badge, { backgroundColor: colorFondo }]}>
            <Text style={[styles.badgeTexto, { color: colorTxt }]}>{e.estado_actual}</Text>
          </View>
        </View>
        <Text style={styles.cardSub}>
          {[e.cod_campana, e.cliente, e.marca].filter(Boolean).join(" · ")}
        </Text>
        <Text style={styles.cardMeta}>
          {[e.categoria, `Hook: ${e.estado_hook}`].filter(Boolean).join("   ·   ")}
        </Text>
        {e.observaciones && (
          <Text style={styles.cardObs}>&ldquo;{e.observaciones}&rdquo;</Text>
        )}
        <Text style={styles.cardFooter}>
          Auditado por {e.auditor_nombre || "—"} ·{" "}
          {new Date(e.fecha_auditoria).toLocaleString("es-PE")}
        </Text>
      </View>
    </View>
  );
}

/** Ficha simplificada para elementos encontrados en tienda que no venían
 * en el catálogo del Consolidado: solo nombre, foto y observaciones, sin
 * badge de estado ni datos de campaña (no aplican). */
function FichaElementoExtra({ e }: { e: ElementoExtra }) {
  return (
    <View style={styles.card} wrap={false}>
      {e.foto_url ? (
        <Image style={styles.foto} src={e.foto_url} />
      ) : (
        <View style={styles.fotoVacia}>
          <Text style={styles.fotoVaciaTexto}>Sin foto</Text>
        </View>
      )}
      <View style={styles.cardDerecha}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitulo}>{e.nombre}</Text>
          <View style={[styles.badge, { backgroundColor: AZUL_FONDO }]}>
            <Text style={[styles.badgeTexto, { color: AZUL }]}>No listado</Text>
          </View>
        </View>
        {e.observaciones && (
          <Text style={styles.cardObs}>&ldquo;{e.observaciones}&rdquo;</Text>
        )}
        <Text style={styles.cardFooter}>
          Registrado por {e.auditor_nombre || "—"} ·{" "}
          {new Date(e.fecha).toLocaleString("es-PE")}
        </Text>
      </View>
    </View>
  );
}

export function ReportePdf({ datos }: { datos: DatosReporteTienda }) {
  const fechaDisplay = datos.fechaReporte
    ? new Date(datos.fechaReporte).toLocaleDateString("es-PE")
    : "";

  // Agrupar por clasificación, en orden fijo.
  const orden = ["Livianos", "Muebles", "Revestimientos"];
  const grupos = new Map<string, ElementoReporte[]>();
  for (const e of datos.elementos) {
    if (!grupos.has(e.clasificacion)) grupos.set(e.clasificacion, []);
    grupos.get(e.clasificacion)!.push(e);
  }
  const clasificacionesOrdenadas = Array.from(grupos.keys()).sort((a, b) => {
    const ia = orden.indexOf(a);
    const ib = orden.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header tienda={datos.tienda} fecha={fechaDisplay} />
        <View style={styles.body}>
          <Portada datos={datos} />
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Header tienda={datos.tienda} fecha={fechaDisplay} />
        <View style={styles.body}>
          {clasificacionesOrdenadas.map((clas) => (
            <View key={clas} minPresenceAhead={140}>
              <Text style={styles.claseHeader}>{clas.toUpperCase()}</Text>
              <View style={styles.claseLinea} />
              {grupos.get(clas)!.map((e, i) => (
                <FichaElemento key={i} e={e} />
              ))}
            </View>
          ))}

          {datos.elementosExtra.length > 0 && (
            <View minPresenceAhead={140}>
              <Text style={styles.claseHeader}>NO LISTADOS</Text>
              <View style={styles.claseLinea} />
              {datos.elementosExtra.map((e) => (
                <FichaElementoExtra key={e.id} e={e} />
              ))}
            </View>
          )}
        </View>
        <Footer />
      </Page>
    </Document>
  );
}
