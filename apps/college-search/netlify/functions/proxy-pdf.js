const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  const pdfUrl = event.queryStringParameters && event.queryStringParameters.url;
  if (!pdfUrl) return { statusCode: 400, headers: CORS, body: "Missing url parameter" };

  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) return { statusCode: res.status, headers: CORS, body: "Failed to fetch PDF" };

    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/pdf", "Cache-Control": "public, max-age=3600" },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("proxy-pdf error:", err);
    return { statusCode: 500, headers: CORS, body: "Error fetching PDF" };
  }
};
