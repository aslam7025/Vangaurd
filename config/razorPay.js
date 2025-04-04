const env = require('dotenv').config()
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { configDotenv } = require("dotenv");

// Initialize Razorpay
const razorpayInstance = new Razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET, // From .env
});

 
const verifySignature = (orderId, paymentId, signature) => {
  const generatedSignature = crypto
  .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");
  

  return generatedSignature === signature;
};

module.exports = {
  razorpayInstance,
  verifySignature,
};












