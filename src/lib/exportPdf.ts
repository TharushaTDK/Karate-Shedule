import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Renders an element to a canvas and drops it into a PDF whose page size
 * exactly matches the element's pixel dimensions. Because the page is
 * custom-sized to fit the content, the export is always a single page no
 * matter how large the bracket grows.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string
) {
  const cssWidth = element.scrollWidth;
  const cssHeight = element.scrollHeight;
  const maxDim = Math.max(cssWidth, cssHeight);
  const scale = maxDim > 3000 ? 1 : 2;

  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: cssWidth >= cssHeight ? "landscape" : "portrait",
    unit: "px",
    format: [cssWidth, cssHeight],
    compress: true,
  });

  pdf.addImage(imgData, "PNG", 0, 0, cssWidth, cssHeight, undefined, "FAST");
  pdf.save(filename);
}
