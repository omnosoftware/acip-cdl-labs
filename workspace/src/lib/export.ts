import { jsPDF } from "jspdf";

export interface QuoteData {
    items: {
        name: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
    }[];
    total: number;
    customerName?: string;
}

export function generatePDF(quote: QuoteData) {
    const doc = new jsPDF();
    const brandColor = [15, 81, 50]; // #0F5132

    // Header
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("TRATOPEL - ORÇAMENTO", 15, 20);

    // Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 15, 40);
    doc.text(`Cliente: ${quote.customerName || "Consumidor"}`, 15, 45);

    // Table Header
    doc.line(15, 52, 195, 52);
    doc.text("Item", 15, 60);
    doc.text("Qtd", 120, 60);
    doc.text("Unit.", 145, 60);
    doc.text("Total", 175, 60);
    doc.line(15, 63, 195, 63);

    // Items
    let y = 70;
    quote.items.forEach((item) => {
        doc.text(item.name.substring(0, 45), 15, y);
        doc.text(item.quantity.toString(), 120, y);
        doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 145, y);
        doc.text(`R$ ${item.subtotal.toFixed(2)}`, 175, y);
        y += 10;
    });

    // Total
    doc.line(15, y, 195, y);
    doc.setFontSize(12);
    doc.text(`VALOR TOTAL: R$ ${quote.total.toFixed(2)}`, 145, y + 10);

    doc.save("orcamento-tratopel.pdf");
}

export function generateExcel(quote: QuoteData) {
    let csv = "Item,Quantidade,Preco Unitario,Subtotal\n";
    quote.items.forEach((item) => {
        csv += `"${item.name}",${item.quantity},${item.unitPrice.toFixed(2)},${item.subtotal.toFixed(2)}\n`;
    });
    csv += `\nTOTAL,,,${quote.total.toFixed(2)}`;

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "orcamento-tratopel.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
