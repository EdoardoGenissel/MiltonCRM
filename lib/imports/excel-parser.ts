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
    // ExcelJS renvoie un tableau 1-indexé (values[0] est vide) - on aligne sur 0.
    allRows.push(values.slice(1))
  })

  const [headerRow, ...rows] = allRows
  return { headerRow: headerRow ?? [], rows }
}

// Détecte le séparateur sur la ligne d'en-tête (avant tout champ quoté) - les
// exports Septéo/Milton sont en point-virgule, mais certains outils exportent en
// virgule.
function detectDelimiter(text: string): string {
  const end = text.indexOf("\n")
  const firstLine = end === -1 ? text : text.slice(0, end)
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return commas > semicolons ? "," : ";"
}

// Tokenizer CSV conforme RFC-4180 : champs quotés, guillemets échappés (`""`),
// séparateurs et retours-ligne embarqués dans les quotes (cf. `data/Liste
// incident.csv`, colonne "Objet / Libellé" multi-lignes). Sur un CSV non quoté
// (exports Septéo propriétaires/locataires/biens), le résultat est identique à un
// simple `split` ligne par ligne puis par séparateur.
function parseCsvText(rawText: string): ParsedSheet {
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText
  const delimiter = detectDelimiter(text)

  const allRows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let rowHasContent = false

  const pushField = () => {
    row.push(field)
    if (field !== "") rowHasContent = true
    field = ""
  }
  const pushRow = () => {
    pushField()
    // Ignore les lignes totalement vides (fin de fichier, séparateur de blocs).
    if (rowHasContent || row.length > 1) allRows.push(row)
    row = []
    rowHasContent = false
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else if (ch !== "\r") {
        // Normalise les fins de ligne embarquées (\r\n -> \n).
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      pushField()
    } else if (ch === "\n") {
      pushRow()
    } else if (ch !== "\r") {
      field += ch
    }
  }
  if (field !== "" || row.length > 0) pushRow()

  const [headerRow, ...rows] = allRows
  return { headerRow: headerRow ?? [], rows }
}

export async function parseTabularBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParsedSheet> {
  if (fileName.toLowerCase().endsWith(".csv")) {
    return parseCsvText(new TextDecoder("utf-8").decode(buffer))
  }
  return parseXlsxBuffer(buffer)
}
