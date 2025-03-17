const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const mongoose = require('mongoose')
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Coupon = require('../../models/couponSchema')
const Wallet = require('../../models/walletSchema')
const crypto = require("crypto");
require('dotenv').config()
const {razorpayInstance, verifySignature} = require('../../config/razorPay')
const { error } = require('console')
const { type, status } = require('express/lib/response')
 

 



 
const orderPlaced = async (req, res) => {
    try {
       
        
        const discount = 199;
        const { userId,totalPrice,addressId,paymentMethod,razorpayPaymentId, razorpayOrderId, razorpaySignature, finalAmount} = req.body;
        

        
       
 
        const findUser = await User.findById(userId);
        if (!findUser) {
            return res.status(404).json({ error: "User not found" });
        }
 
        const userAddressDoc = await Address.findOne({ userId });
        if (!userAddressDoc) {
            return res.status(404).json({ error: "Address not found" });
        }
 
        const desiredAddress = userAddressDoc.address.id(addressId);
        if (!desiredAddress) {
            return res.status(404).json({ error: "Selected address not found" });
        }

        
      

         
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Your cart is empty." });
        }


        
 
        const outOfStockItems = [];
        for (const item of cart.items) {
         
            

            const product = await Product.findOne({_id : item.productId});
           
            if (!product || product.quantity < item.quantity) {
                outOfStockItems.push({
                    product: product ? product.productName : 'Unknown Product',
                    requestedQuantity: item.quantity,
                    availableQuantity: product ? product.quantity : 0
                });
            }
        }
 

        if (outOfStockItems.length > 0) {
            return res.status(400).json({
                error: "Some items are out of stock.",
                outOfStockItems
            });
        }


         let totalAmount = totalPrice - discount


        if(paymentMethod === 'wallet'){
            if( findUser.walletBalance < totalAmount ){
                return res.status(400).json({error: 'Insufficent wallet balance.'})
            }
            findUser.walletBalance -= totalAmount
            await findUser.save()

        }else if (paymentMethod === 'razorpay'){
            const paymentverified = await verifyRazorpayPayment(razorpayPaymentId,razorpayOrderId,razorpaySignature,totalAmount)
            
            if(!paymentverified){
                return res.status(400).json({ error: 'Razorpay payment verification failed'})
            }
        }

 
        for (const item of cart.items) {
            const product = await Product.findById(item.productId);
            product.quantity -= item.quantity;
            await product.save();
        }

        // Create the order with embedded address and mapped items
        const newOrder = new Order({
            userId,
            orderedItems: cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
                size: item.size 
            })),
            totalPrice,
            discount,
            finalAmount:totalAmount,
            address: desiredAddress.toObject(), // Embed the address details
            paymentMethod,
            status:'Pending'
        });

        await newOrder.save();

        // Clear the user's cart
        await Cart.deleteOne({ userId });

        res.status(200).json({ success: true, message: "Order placed successfully!", order: newOrder });

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};




const verifyRazorpayPayment = async (req,res) => {
    console.log("working verify razorpay")
    const discount = 199
    const {userId,addressId,totalPrice,paymentMethod,razorpayOrderId,razorpayPaymentId,razorpaySignature} =req.body
    const isSignatureValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
    if(!isSignatureValid){
        return res.status(400).json({ error : "Invalid Razorpay Signature" });
    }

    try {
        
        const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);

        if (payment.status === "captured" && payment.amount === totalPrice * 100) {

            const findUser = await User.findById(userId)
            if(!findUser){
                return res.status(404).json({error : 'User not found'})
            }

            const findAddress = await Address.findOne({userId})
            if(!findAddress){
               return res.status(404).json({error : 'Address not found'})
            }


            const selectedAddress = await findAddress.address.id(addressId)
            if(!selectedAddress){
               return res.status(404).json({error : 'selectedAddress not found'})
            }


               
           const cart = await Cart.findOne({ userId }).populate('items.productId');
            if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Your cart is empty." });
        }


        const outOfStockItems = []

        for(const item of cart.items ){

            const product = await Product.findOne({_id:item.productId})

            if(!product || product.quantity < item.quantity){

                outOfStockItems.push({
                    product:product ? product.productName : 'Unknown product',
                    requestedQuantity : item.quantity,
                    availableQuantity : product ? product.quantity :0
                })
            }
        }


        if(outOfStockItems.length > 0){
            return res.status(404).json({error : 'Some items are out fo stock.',outOfStockItems})
        }


       let totalAmount  = totalPrice - discount

       for (const item of cart.items) {
        const product = await Product.findById(item.productId);
        product.quantity -= item.quantity;
        await product.save();
    }


    const newOrder = new Order({
        userId,
        orderedItems:cart.items.map( item => ({
            product: item.productId,
            quantity:item.quantity,
            price:item.price,
            size: item.size
        })),
        totalPrice,
        discount,
        finalAmount:totalAmount,
        address:selectedAddress.toObject(),
        paymentMethod,
        status:'Confirmed'
    })
    

    await newOrder.save()

    await Cart.deleteOne({userId})


            return res.json({ success: true, message: "Payment verified successfully" });

        } else {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Razorpay verification error:", error);
        return res.status(500).json({ success: false, message: "Server error during payment verification" });
    }
};








const createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpayInstance.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Razorpay order creation failed" });
    }
};



const walletPayment = async (req,res)=> {

    try {
        const discount =199

        console.log('first',req.body)
        const { userId ,addressId , totalPrice,paymentMethod} = req.body


        console.log('body',userId,addressId,totalPrice)
        const findUser = await User.findById(userId)
        if(!findUser){
            return res.status(404).json({success:false,error:'User not found'})

        }


        const findAddress = await Address.findOne({userId})
        if(!findAddress){
            return res.status(404).json({success:false,error:'address not found'})

        }

        const selectedAddress = await findAddress.address.id(addressId)
        if(!selectedAddress){
            return res.status(404).json({success:false,error:'Address not found'})

        }


        const wallet = await Wallet.findOne({userId})
        if(!wallet){
            return res.status(400).json({success:false, error:'Wallet not found.'})

        }

        if(wallet.balance < totalPrice){
            return res.status(400).json({success:false, error:'Insufficient wallet balance.'})

        }

        const cart = await Cart.findOne({userId}).populate('items.productId')
        if(!cart || cart.items.length === 0 ){
            return res.status(400).json({success:false,error:'Cart is empty'})
        }


        
        const outOfStockItems = []

        for(const item of cart.items ){

            const product = await Product.findOne({_id:item.productId})

            if(!product || product.quantity < item.quantity){

                outOfStockItems.push({
                    product:product ? product.productName : 'Unknown product',
                    requestedQuantity : item.quantity,
                    availableQuantity : product ? product.quantity :0
                })
            }
        }

        if(outOfStockItems.length > 0){
            return res.status(404).json({error : 'Some items are out fo stock.',outOfStockItems})
        }


        let totalAmount  = totalPrice - discount

        for (const item of cart.items) {
         const product = await Product.findById(item.productId);
         product.quantity -= item.quantity;
         await product.save();
     }
 




        wallet.balance -= totalPrice
        wallet.transactions.push({
            type:'debit',
            amount:totalPrice,
            description:'Order Payment via Wallet'
        })
        

        await wallet.save()

        

    const newOrder = new Order({
        userId,
        orderedItems:cart.items.map( item => ({
            product: item.productId,
            quantity:item.quantity,
            price:item.price,
            size: item.size
        })),
        totalPrice,
        discount,
        finalAmount:totalAmount,
        address:selectedAddress.toObject(),
        paymentMethod,
        status:'Confirmed'
    })


        await newOrder.save()

        await Cart.deleteOne({userId})

        res.json({success:true,message:'Order placed successfully via wallet.'})
    } catch (error) {
        console.log('Error processing wallet payment :',error)

        res.status(500).json({success:false,error:'Internal server error'})
        
    }
}


const loadOrderSuccess = async (req,res) => {
    try {
        res.render('order-success')
    } catch (error) {
        
    }
}




      
const viewOrders = async (req, res) => {
    try {
        const userId = req.session.user;

        console.log(userId)
        const orders=await Order.find({userId:userId})
        .populate('userId')
        .populate('orderedItems.product').sort({ createdOn: -1 }); 

      
        res.render("orders",{orders,})
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).render('orders', { user: req.session.user, orders: [], error: "Failed to fetch orders." });
    }
 
}





const cancelOrder = async (req,res) => {
    try {

      
        const {orderId} = req.body
        const userId = req.session.user

         

        const findUser = await User.findById(userId)


        if(!findUser){
            return res.status(404).json({message:'User not found'})
        }

       
        const findOrder = await Order.findOne({orderId:orderId})

        if (!findOrder) {
          return res.status(404).json({ message: "Order not found" });
        }

        if (findOrder.status === "Cancelled") {
            return res.status(400).json({ message: "Order is already cancelled" });
          }


          for(const item of findOrder.orderedItems){
            const product = await Product.findById(item.product)

            if(product){
              product.quantity += item.quantity
              await product.save()
            }
          }




        if (findOrder.paymentMethod === "razorpay" || findOrder.paymentMethod === "wallet") {
            let wallet = await Wallet.findOne({ userId: userId });

            if(!wallet){
                wallet = new Wallet({userId , balance:0, transactions:[]})
            }

            wallet.balance += findOrder.finalAmount;
            wallet.transactions.push({
                type: "credit",
                amount: findOrder.finalAmount,
                description: `Refund for cancelled order #${orderId}`,
                orderId: findOrder._id,
            });

            await wallet.save()

        }

        
          await Order.updateOne({ orderId: orderId }, { status: "Cancelled" });
          
          res.status(200).json({ message: "Order cancelled successfully" });
          
    
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" })   
        
    }
}



const returnOreder = async (req,res) =>{

    
    const {orderId} = req.params
    const {returnReason} = req.body


    try {

        const order = await Order.findOne({orderId})
         
        if(!order){
            return res.status(404).json({message:'Order not found'})
        }

        if(order.status !== 'Delivered'){
            return res.status(400).json({message:'Only delivers can ber returned'})
        }


        order.status = 'Return Request'
        order.returnReason = returnReason

        await order.save()

        res.redirect('/orders')


        
    } catch (error) {
        console.error('Return order error:',error)
        res.status(500).send('Error processing return request')
        
    }
}



const getOrderDetails = async (req,res) => {
    try {

        const orderId = req.params.orderId;
        const userId = req.session.user


        const order = await Order.findOne({ _id: orderId, userId })
        .populate('orderedItems.product').lean()
        

        if (!order) {
            return res.status(404).json({message:'users order not found'})
        }

        res.render('order-details',{order})

    } catch (error) {
          console.error("Error fetching order details:", error);
        res.status(500).redirect('/pageNotFound');
    }
}



module.exports = {
    orderPlaced,
    loadOrderSuccess,
    viewOrders,
    cancelOrder,
    returnOreder,
    getOrderDetails,
    verifyRazorpayPayment,
    createRazorpayOrder,
    walletPayment,




}