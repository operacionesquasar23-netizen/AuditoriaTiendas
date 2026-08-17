import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerDatosReporteTienda } from "@/lib/utils/reporte";
import { ReportePdf } from "@/lib/pdf/ReportePdf";

export async function GET(request: NextRequest) {
  const catalogoId = request.nextUrl.searchParams.get("catalogoId");
  const tienda = request.nextUrl.searchParams.get("tienda");

  if (!catalogoId || !tienda) {
    return NextResponse.json(
      { error: "Faltan los parámetros catalogoId y tienda." },
      { status: 400 }
    );
  }

  try {
    const datos = await obtenerDatosReporteTienda(catalogoId, tienda);

    if (datos.totalElementos === 0) {
      return NextResponse.json(
        { error: "Esta tienda todavía no tiene elementos auditados." },
        { status: 404 }
      );
    }

    const buffer = await renderToBuffer(<ReportePdf datos={datos} />);
    const nombreArchivo = `Reporte_${tienda.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo generar el reporte PDF.",
      },
      { status: 500 }
    );
  }
}
