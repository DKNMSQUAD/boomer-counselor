const crypto = require("crypto");
const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};

function getCreds() {
  return {
    type:"service_account",
    project_id:process.env.FIREBASE_PROJECT_ID,
    private_key_id:process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,"\n"),
    client_email:process.env.FIREBASE_CLIENT_EMAIL,
    auth_uri:"https://accounts.google.com/o/oauth2/auth",
    token_uri:"https://oauth2.googleapis.com/token"
  };
}

let _db=null;
async function getDb(){
  if(_db)return _db;
  const admin=require("firebase-admin");
  if(!admin.apps.length){admin.initializeApp({credential:admin.credential.cert(getCreds())});}
  _db=admin.firestore();
  return _db;
}

async function logToSheets(data){
  const{google}=require("googleapis");
  const auth=new google.auth.GoogleAuth({credentials:getCreds(),scopes:["https://www.googleapis.com/auth/spreadsheets"]});
  const sheets=google.sheets({version:"v4",auth});
  await sheets.spreadsheets.values.append({
    spreadsheetId:process.env.GOOGLE_SHEET_ID,
    range:"Payments!A:L",
    valueInputOption:"USER_ENTERED",
    requestBody:{values:[[
      new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),
      data.customer.name,data.customer.school,data.customer.email,data.customer.phone,
      data.collegeName,data.collegeId,data.orderId,data.paymentId,
      "\u20b9"+data.amount,"SUCCESS",data.pdfUrl||""
    ]]}
  });
}

async function sendReportEmail({customer,collegeName,pdfUrl}){
  const nodemailer=require("nodemailer");
  const t=nodemailer.createTransport({service:"gmail",auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD}});
  const r=await fetch(pdfUrl);
  if(!r.ok)throw new Error("PDF fetch failed");
  const buf=Buffer.from(await r.arrayBuffer());
  const safe=collegeName.replace(/[^a-z0-9\s]/gi,"").trim().replace(/\s+/g,"-");
  await t.sendMail({
    from:`"NM Squad Reports" <${process.env.GMAIL_USER}>`,
    to:customer.email,
    subject:"Your College Report: "+collegeName+" \u2014 NM Squad",
    html:`<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto"><h2>Your Report is Ready</h2><p>Dear ${customer.name},</p><p>Your full report for <strong>${collegeName}</strong> is attached.</p></div>`,
    attachments:[{filename:safe+"-Report.pdf",content:buf,contentType:"application/pdf"}]
  });
}

exports.handler=async(event)=>{
  if(event.httpMethod==="OPTIONS")return{statusCode:200,headers:CORS,body:""};
  if(event.httpMethod!=="POST")return{statusCode:405,headers:CORS,body:JSON.stringify({error:"Method not allowed"})};
  let body;
  try{body=JSON.parse(event.body);}catch{return{statusCode:400,headers:CORS,body:JSON.stringify({error:"Invalid body"})};}
  const{razorpay_payment_id,razorpay_order_id,razorpay_signature,customer,collegeId,collegeName,pdfUrl,amount}=body;
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex");
  if(expected!==razorpay_signature)return{statusCode:400,headers:CORS,body:JSON.stringify({error:"Payment verification failed."})};
  try{const admin=require("firebase-admin");const db=await getDb();await db.collection("payments").add({createdAt:admin.firestore.FieldValue.serverTimestamp(),customer,collegeId,collegeName,amount,orderId:razorpay_order_id,paymentId:razorpay_payment_id,status:"SUCCESS"});}catch(e){console.error("Firebase:",e.message);}
  try{await logToSheets({customer,collegeId,collegeName,orderId:razorpay_order_id,paymentId:razorpay_payment_id,amount,pdfUrl});}catch(e){console.error("Sheets:",e.message);}
  if(!pdfUrl)return{statusCode:200,headers:CORS,body:JSON.stringify({success:true})};
  try{await sendReportEmail({customer,collegeName,pdfUrl});}catch(e){return{statusCode:500,headers:CORS,body:JSON.stringify({error:"Payment ok but email failed. ID:"+razorpay_payment_id})};}
  return{statusCode:200,headers:CORS,body:JSON.stringify({success:true,message:"Report sent to "+customer.email})};
};
