import { useState } from "react";

const Field = ({ label, value, onChange, type = "text", placeholder }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)" }}>
      {label} <span style={{ color: "var(--accent)" }}>*</span>
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ padding: "10px 12px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
    />
  </div>
);

export default function PaywallModal({ college, price, onSuccess, onClose }) {
  const [step, setStep]       = useState("form"); // form | paying | success | error
  const [customer, setCustomer] = useState({ name: "", school: "", email: "", phone: "" });
  const [errMsg, setErrMsg]   = useState("");

  const set = (k) => (e) => setCustomer((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!customer.name.trim())   return "Please enter your full name.";
    if (!customer.school.trim()) return "Please enter your school or organisation.";
    if (!/\S+@\S+\.\S+/.test(customer.email)) return "Please enter a valid email address. Your report will be sent here.";
    if (customer.phone.replace(/\D/g, "").length < 10) return "Please enter a valid phone number (min 10 digits).";
    return null;
  };

  const loadRazorpay = () =>
    new Promise((res, rej) => {
      if (window.Razorpay) return res();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = res;
      s.onerror = () => rej(new Error("Failed to load payment gateway"));
      document.head.appendChild(s);
    });

  const handlePay = async () => {
    const err = validate();
    if (err) { setErrMsg(err); return; }
    setErrMsg("");
    setStep("paying");

    try {
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price, collegeId: college.id, collegeName: college.name }),
      });
      if (!orderRes.ok) {
        const d = await orderRes.json().catch(() => ({}));
        throw new Error(d.error || "Could not create order. Please try again.");
      }
      const { orderId, amount: orderAmount, currency, keyId } = await orderRes.json();

      await loadRazorpay();

      await new Promise((resolve, reject) => {
        const options = {
          key: keyId,
          amount: orderAmount,
          currency,
          name: "Boomer Counselor",
          description: "College Report: " + college.name,
          order_id: orderId,
          prefill: { name: customer.name, email: customer.email, contact: customer.phone },
          notes: { college_id: college.id, college_name: college.name, school: customer.school },
          theme: { color: "#c0392b" },
          handler: async (response) => {
            try {
              const vRes = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_signature:  response.razorpay_signature,
                  customer,
                  collegeId:   college.id,
                  collegeName: college.name,
                  pdfUrl:      college.reportUrl,
                  amount:      price,
                }),
              });
              if (!vRes.ok) {
                const d = await vRes.json().catch(() => ({}));
                throw new Error(d.error || "Payment verification failed.");
              }
              setStep("success");
              onSuccess(customer.email);
              resolve();
            } catch (vErr) {
              setErrMsg(vErr.message);
              setStep("error");
              reject(vErr);
            }
          },
          modal: {
            ondismiss: () => {
              setStep("form");
              reject(new Error("cancelled"));
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (r) => {
          setErrMsg("Payment failed: " + (r.error.description || "Unknown error"));
          setStep("error");
          reject(new Error(r.error.description));
        });
        rzp.open();
      });
    } catch (err) {
      if (err.message !== "cancelled") {
        setErrMsg(err.message || "Something went wrong. Please try again.");
        setStep("error");
      } else {
        setStep("form");
      }
    }
  };



  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(500px, 94vw)", background: "var(--paper)",
        zIndex: 1101, boxShadow: "0 32px 100px rgba(0,0,0,0.5)",
        animation: "paySlideUp 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 26px 18px", borderBottom: "2px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
              Unlock Full Report
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 3, textTransform: "uppercase" }}>
              {college.name}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: "var(--accent)" }}>&#8377;{price}</span>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", width: 30, height: 30, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
              &times;
            </button>
          </div>
        </div>

        <div style={{ padding: "24px 26px 28px" }}>
          {/* Success */}
          {step === "success" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>&#10003;</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
                Payment Confirmed
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
                Your full report has been sent to<br />
                <strong style={{ color: "var(--ink)" }}>{customer.email}</strong>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", marginTop: 10, letterSpacing: "0.06em" }}>
                Check your inbox and spam folder.
              </div>
              <button onClick={onClose} style={{ marginTop: 22, padding: "10px 32px", background: "var(--ink)", color: "var(--bg)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>
                Close
              </button>
            </div>
          )}

          {/* Paying */}
          {step === "paying" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Opening secure payment&hellip;
              </div>
            </div>
          )}

          {/* Form / Error */}
          {(step === "form" || step === "error") && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Full Name" value={customer.name} onChange={(e) => setCustomer(p => ({...p, name: e.target.value}))} placeholder="Your full name" />
                <Field label="School / Organisation" value={customer.school} onChange={(e) => setCustomer(p => ({...p, school: e.target.value}))} placeholder="School, college or company" />
                <Field label="Email Address" value={customer.email} onChange={(e) => setCustomer(p => ({...p, email: e.target.value}))} type="email" placeholder="Report will be delivered here" />
                <Field label="Phone Number" value={customer.phone} onChange={(e) => setCustomer(p => ({...p, phone: e.target.value}))} type="tel" placeholder="+91 or international" />
              </div>

              {errMsg && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(192,57,43,0.07)", border: "1px solid var(--accent)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--accent)", lineHeight: 1.5 }}>
                  {errMsg}
                </div>
              )}

              <button
                onClick={handlePay}
                style={{ marginTop: 20, width: "100%", padding: "14px", background: "var(--accent)", color: "#fff", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 600, transition: "opacity 0.15s" }}
                onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.target.style.opacity = "1")}
              >
                Pay Securely &#8212; &#8377;{price}
              </button>

              <div style={{ textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 10 }}>
                &#128274; Razorpay &middot; UPI &middot; Credit / Debit Card &middot; Net Banking &middot; Wallets
              </div>

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
                Your full report PDF is emailed immediately after payment is cryptographically verified on our server. No report is sent if payment fails or is disputed.
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes paySlideUp {
          from { opacity: 0; transform: translate(-50%, -46%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}
