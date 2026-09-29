export async function exportReportPDF(topic, report, sources = []) {
  const response = await fetch("http://localhost:8000/api/report/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, report, sources }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`PDF export failed (${response.status}): ${errorText || response.statusText}`);
  }

  // stream the binary response into a blob and trigger download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `research-${topic.slice(0, 30).replace(/\s+/g, "-")}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
