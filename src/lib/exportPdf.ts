import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export async function exportElementsToPdf(
  elements: HTMLElement[],
  filename: string
) {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const a4Width = 297;
  const a4Height = 210;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    
    const imgData = canvas.toDataURL("image/png");
    
    const imgRatio = canvas.width / canvas.height;
    const pageRatio = a4Width / a4Height;
    
    let renderWidth = a4Width;
    let renderHeight = a4Height;
    
    if (imgRatio > pageRatio) {
      renderHeight = a4Width / imgRatio;
    } else {
      renderWidth = a4Height * imgRatio;
    }
    
    const x = (a4Width - renderWidth) / 2;
    // Anchor to the top with a small safety margin instead of centering
    // vertically, so pages with a wide aspect ratio don't get a large
    // blank gap above the content.
    const y = Math.max(0, Math.min(4, a4Height - renderHeight));
    
    if (i > 0) {
      pdf.addPage();
    }
    
    pdf.addImage(imgData, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");
  }
  
  pdf.save(filename);
}
