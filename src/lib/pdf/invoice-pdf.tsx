/**
 * PDF-document voor één factuur. A4-staand, zelfde @react-pdf/renderer-
 * aanpak en V2-papierkleuren als de story-PDF (zie story-pdf.tsx). Ook
 * hier de PDF-standaard-fonts (Helvetica + Times) — afdoende voor een
 * administratieve download.
 *
 * De berekening (excl. BTW uit het bruto bedrag) gebeurt bewust in de
 * route, niet hier: dit component rendert alleen wat het krijgt.
 */
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { COMPANY } from "@/lib/legal";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f5efe4", // V2.paper
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f1e3a", // V2.ink
  },

  // Kop: bedrijf links, "FACTUUR" rechts.
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Times-Italic",
    marginBottom: 6,
  },
  companyLine: {
    fontSize: 9,
    color: "#5b5550",
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textAlign: "right",
  },
  invoiceMeta: {
    fontSize: 9,
    color: "#5b5550",
    textAlign: "right",
    marginTop: 8,
    lineHeight: 1.6,
  },

  // Klantblok.
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: "#9a8a4f",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  customerBlock: {
    marginBottom: 36,
  },
  customerLine: {
    fontSize: 10,
    lineHeight: 1.5,
  },

  // Regels-tabel.
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1f1e3a",
    paddingBottom: 6,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2d7c2",
  },
  colDescription: { flex: 1, paddingRight: 12 },
  colAmount: { width: 90, textAlign: "right" },
  headerCell: {
    fontSize: 8,
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
    color: "#5b5550",
    textTransform: "uppercase",
  },
  cell: {
    fontSize: 10,
  },

  // Totalen.
  totalsBlock: {
    alignSelf: "flex-end",
    width: 260,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: "#5b5550",
  },
  totalsValue: {
    fontSize: 10,
  },
  totalsGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1f1e3a",
    marginTop: 4,
    paddingTop: 6,
  },
  totalsGrandLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  totalsGrandValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },

  // Terugbetaald-melding.
  refundNote: {
    marginTop: 24,
    padding: 10,
    backgroundColor: "#ebe2d1",
    fontSize: 10,
    fontFamily: "Times-Italic",
    color: "#5b5550",
  },

  // Voettekst.
  footer: {
    position: "absolute",
    bottom: 36,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: "#e2d7c2",
    paddingTop: 10,
    fontSize: 8,
    color: "#9a9087",
    textAlign: "center",
    lineHeight: 1.6,
  },
});

export type InvoicePdfInput = {
  invoiceNumber: string;
  /** Factuurdatum = paidAt van de order. */
  invoiceDate: Date;
  /** Omschrijving van de orderregel. */
  description: string;
  /** Bedrag excl. BTW in centen. */
  exclCents: number;
  /** BTW-bedrag in centen. */
  vatCents: number;
  /** Bruto totaal (incl. BTW) in centen. */
  totalCents: number;
  /** BTW-percentage (geheel getal, bv. 21). */
  vatRate: number;
  currency: string;
  /** Klantblok: naam altijd, adresregels alleen wanneer ingevuld. */
  customerName: string;
  customerEmail: string | null;
  customerAddressLines: string[];
  /** Ons interne bestelnummer (order.id) voor de voettekst. */
  orderId: string;
  /** Gevuld wanneer de order is terugbetaald. */
  refundedAt: Date | null;
};

function formatDateNl(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCents(cents: number, currency: string): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const symbol = currency === "EUR" ? "€ " : `${currency} `;
  return `${sign}${symbol}${(abs / 100).toFixed(2).replace(".", ",")}`;
}

export function InvoicePdfDocument({ invoice }: { invoice: InvoicePdfInput }) {
  return (
    <Document
      title={`Factuur ${invoice.invoiceNumber}`}
      author={COMPANY.name}
      subject="Factuur"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Kop ─────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>Ons Verhaaltje</Text>
            <Text style={styles.companyLine}>{COMPANY.name}</Text>
            {COMPANY.address ? (
              <Text style={styles.companyLine}>{COMPANY.address}</Text>
            ) : null}
            {COMPANY.kvk ? (
              <Text style={styles.companyLine}>KvK: {COMPANY.kvk}</Text>
            ) : null}
            {COMPANY.btw ? (
              <Text style={styles.companyLine}>BTW: {COMPANY.btw}</Text>
            ) : null}
            <Text style={styles.companyLine}>{COMPANY.email}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FACTUUR</Text>
            <Text style={styles.invoiceMeta}>
              Factuurnummer: {invoice.invoiceNumber}
              {"\n"}
              Factuurdatum: {formatDateNl(invoice.invoiceDate)}
            </Text>
          </View>
        </View>

        {/* ── Klant ───────────────────────────────────────── */}
        <View style={styles.customerBlock}>
          <Text style={styles.sectionLabel}>Factuur aan</Text>
          <Text style={styles.customerLine}>{invoice.customerName}</Text>
          {invoice.customerAddressLines.map((line, i) => (
            <Text key={i} style={styles.customerLine}>
              {line}
            </Text>
          ))}
          {invoice.customerEmail ? (
            <Text style={styles.customerLine}>{invoice.customerEmail}</Text>
          ) : null}
        </View>

        {/* ── Regels ──────────────────────────────────────── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colDescription]}>
              Omschrijving
            </Text>
            <Text style={[styles.headerCell, styles.colAmount]}>
              Bedrag excl. BTW
            </Text>
            <Text style={[styles.headerCell, styles.colAmount]}>
              BTW ({invoice.vatRate}%)
            </Text>
            <Text style={[styles.headerCell, styles.colAmount]}>
              Totaal incl.
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.cell, styles.colDescription]}>
              {invoice.description}
            </Text>
            <Text style={[styles.cell, styles.colAmount]}>
              {formatCents(invoice.exclCents, invoice.currency)}
            </Text>
            <Text style={[styles.cell, styles.colAmount]}>
              {formatCents(invoice.vatCents, invoice.currency)}
            </Text>
            <Text style={[styles.cell, styles.colAmount]}>
              {formatCents(invoice.totalCents, invoice.currency)}
            </Text>
          </View>
        </View>

        {/* ── Totalen ─────────────────────────────────────── */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotaal excl. BTW</Text>
            <Text style={styles.totalsValue}>
              {formatCents(invoice.exclCents, invoice.currency)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>BTW {invoice.vatRate}%</Text>
            <Text style={styles.totalsValue}>
              {formatCents(invoice.vatCents, invoice.currency)}
            </Text>
          </View>
          <View style={styles.totalsGrand}>
            <Text style={styles.totalsGrandLabel}>Totaal</Text>
            <Text style={styles.totalsGrandValue}>
              {formatCents(invoice.totalCents, invoice.currency)}
            </Text>
          </View>
        </View>

        {/* ── Terugbetaald ────────────────────────────────── */}
        {invoice.refundedAt ? (
          <Text style={styles.refundNote}>
            Terugbetaald op {formatDateNl(invoice.refundedAt)}.
          </Text>
        ) : null}

        {/* ── Voettekst ───────────────────────────────────── */}
        <Text style={styles.footer}>
          Betaald via Mollie · Bestelnummer {invoice.orderId}
          {"\n"}
          {COMPANY.name} · onsverhaaltje.nl · {COMPANY.email}
        </Text>
      </Page>
    </Document>
  );
}
