import ExcelJS from "exceljs"

export type ParsedSheet = {
  headerRow: unknown[]
  rows: unknown[][]
}

// Lit la première feuille d'un classeur Excel (export Apimo) : la première ligne
// est traitée comme en-tête, les suivantes comme données.
async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) return { headerRow: [], rows: [] }

  const allRows: unknown[][] = []
  sheet.eachRow((row) => {
    const values = row.values as unknown[]
    // ExcelJS renvoie un tableau 1-indexé (values[0] est vide) — on aligne sur 0.
    allRows.push(values.slice(1))
  })

  const [headerRow, ...rows] = allRows
  return { headerRow: headerRow ?? [], rows }
}

// Les exports Septéo sont des CSV point-virgule (pas de quoting significatif
// observé dans les fichiers réels transmis par Milton — cf. `data/`), donc un
// split simple suffit plutôt que d'embarquer un parseur CSV complet.
function parseCsvText(text: string): ParsedSheet {
  const lines = text.split(/\r\n|\n/).filter((line) => line.length > 0)
  const allRows = lines.map((line) => line.split(";"))
  const [headerRow, ...rows] = allRows
  return { headerRow: headerRow ?? [], rows }
}

export async function parseTabularBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedSheet> {
  if (fileName.toLowerCase().endsWith(".csv")) {
    return parseCsvText(new TextDecoder("utf-8").decode(buffer))
  }
  return parseXlsxBuffer(buffer)
}
