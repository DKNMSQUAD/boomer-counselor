const Razorpay = require("razorpay");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { amount, collegeId, collegeName } = JSON.parse(event.body);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const receipt = `rpt_${(collegeId || "").slice(0, 20)}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: Math.round((amount || 499) * 100), // paise
      currency: "INR",
      receipt,
      notes: {
        college_id: String(collegeId || ""),
        college_name: String(collegeName || ""),
      },
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      }),
    };
  } catch (err) {
    console.error("create-order error:", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message || "Failed to create order" }),
    };
  }
};
