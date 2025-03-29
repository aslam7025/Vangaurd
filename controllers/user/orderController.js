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
const router = require('../../routes/userRouter')
 

 



 
const orderPlaced = async (req, res) => {
    try {
       
        
         
        const { userId,totalPrice,addressId,paymentMethod,razorpayPaymentId, razorpayOrderId, razorpaySignature, discount} = req.body;
        

        
       
 
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

 
 
        for (const item of cart.items) {
            const product = await Product.findById(item.productId);
            product.quantity -= item.quantity;
            await product.save();
        }

        
        const newOrder = new Order({
            userId,
            orderedItems: cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
                size: item.size 
            })),
            totalPrice,
            discount:discount?discount:0,
            finalAmount:totalAmount,
            address: desiredAddress.toObject(), 
            paymentMethod,
            status:'Pending'
        });

        await newOrder.save();

      
        await Cart.deleteOne({ userId });

        res.status(200).json({ success: true, message: "Order placed successfully!", order: newOrder });

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};





const walletPayment = async (req,res)=> {

    try {
       

        console.log('first',req.body)
        const { userId ,addressId , totalPrice,paymentMethod,discount} = req.body


        console.log('body',userId,addressId,totalPrice)
        const findUser = await User.findById(userId)
        if(!findUser){
            return res.status(404).json({success:false,error:'User not found'})

        }


        const findAddress = await Address.findOne({userId})
        if(!findAddress){
            return res.status(404).json({success:false,error:'address not found'})

        }

        const selectedAddress =  findAddress.address.id(addressId)
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
 


        

    const newOrder = new Order({
        userId,
        orderedItems:cart.items.map( item => ({
            product: item.productId,
            quantity:item.quantity,
            price:item.price,
            size: item.size
        })),
        totalPrice,
        discount:discount?discount:0,
        finalAmount:totalAmount,
        address:selectedAddress.toObject(),
        paymentMethod,
        status:'Confirmed'
    })


        await newOrder.save()



        


        wallet.balance -= totalPrice
        wallet.transactions.push({
            type:'debit',
            amount:totalPrice,
            description:'Order Payment via Wallet',
            orderId:newOrder._id
        })
        

        await wallet.save()


        await Cart.deleteOne({userId})

        res.json({success:true,message:'Order placed successfully via wallet.'})
    } catch (error) {
        console.log('Error processing wallet payment :',error)

        res.status(500).json({success:false,error:'Internal server error'})
        
    }
}






const verifyRazorpayPayment = async (req,res) => {
    
    const {userId,addressId,totalPrice,paymentMethod,razorpayOrderId,razorpayPaymentId,razorpaySignature,discount,orderId} =req.body
    console.log('first working',orderId,totalPrice,razorpayOrderId,razorpayPaymentId,razorpaySignature)
 
    const isSignatureValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
     
    if(!isSignatureValid){
        return res.status(400).json({ error : "Invalid Razorpay Signature" });
    }

    try {
        
        const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);
        console.log('checking first :',payment)

        if (payment.status === "captured" && payment.amount === totalPrice * 100) {
            console.log('checking second:')

            
            const cart = await Cart.findOne({ userId }).populate('items.productId');
            if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Your cart is empty." });
        }

        

            //from retry payment
            
        let existingOrder = await Order.findOne({_id:orderId});
        console.log('check 3',existingOrder)

        if (existingOrder) {
            if (existingOrder.status === 'Failed') {


                
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



       for (const item of cart.items) {
        const product = await Product.findById(item.productId);
        product.quantity -= item.quantity;
        await product.save();
    }



                
                
                existingOrder.status = 'Confirmed';
                await existingOrder.save();

                await Cart.updateOne({userId},{$set:{items:[]}})
                return res.json({ success: true, message: "Payment retried successfully, order confirmed." });
            } else {
                return res.status(400).json({ error: "Order is already processed or not failed." });
            }
        }
    



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





    //from checkout call



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
        discount:discount?discount:0,
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
    console.log('is called')
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


const loadOrderSuccess = async (req,res) => {
    try {
        res.render('order-success')
    } catch (error) {
        
    }
}


const loadOrderFailed = async(req,res)=> {
    try {
        res.render('order-failed')
        
    } catch (error) {
        
    }
}



const getFailedOrders = async (req,res)=> {
    try {

         const failedOrders = await Order.find({status:'Failed'})
         .populate('userId').
         populate({
            path:'orderedItems.product',
            select:'productName productImage price'
        
        })

         console.log('f orders:',failedOrders)
        res.render('failed-orders',{
            RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
            failedOrders:failedOrders
        })
        
    } catch (error) {
        console.error('Error fetching failed orders:', error);
        res.status(500).json({success:false,message:'Internal Server Error'});
        
    }
}



const createFailedOrder = async (req, res) => {
    try {
        const { userId, addressId, totalPrice, discount, paymentMethod, razorpayPaymentId, razorpayOrderId } = req.body;
        console.log('first',userId, addressId, totalPrice, discount, paymentMethod, razorpayPaymentId, razorpayOrderId)


        
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        console.log('is cart',cart)
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success:false,message: "Your cart is empty." });
        }

        
        const outOfStockItems = [];
        for (const item of cart.items) {
             
            const product = await Product.findById(item.productId);
        
            if (!product || product.quantity < item.quantity) {
                outOfStockItems.push({
                    product: product ? product.productName : 'Unknown product',
                    requestedQuantity: item.quantity,
                    availableQuantity: product ? product.quantity : 0
                });
            }
        }

        const existingFailedOrder = await Order.findOne({ razorpayOrderId, status: 'Failed' });

        if (existingFailedOrder) {
            return res.status(400).json({ success: false, message: "A failed order for this payment already exists." });
        }

        if (outOfStockItems.length > 0) {
            return res.status(404).json({ success:false,message: 'Some items are out of stock.', outOfStockItems });
        }

        const findAddress = await Address.findOne({userId})
        if(!findAddress){
           return res.status(404).json({error : 'Address not found'})
        }


         
        const selectedAddress = await findAddress.address.id(addressId);
       // console.log(selectedAddress)
        if (!selectedAddress) {
            return res.status(400).json({ error: "Invalid address." });
        }

     
        let totalAmount = totalPrice - (discount || 0);

      
        const order = new Order({
            userId,
            orderedItems: cart.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
                size: item.size
            })),
            totalPrice,
            discount: discount || 0,
            finalAmount: totalAmount,
            address: selectedAddress.toObject(),
            paymentMethod,
            status: 'Failed',   
            razorpayPaymentId,
            razorpayOrderId,
            
        });

        await order.save();
        

        console.log("Order created with status 'Failed' due to payment failure.",order);

        return res.json({ success: true, orderId: order._id });

    } catch (error) {
        console.error(" Error saving failed order:", error);
        return res.status(500).json({ error: "Failed to create order." });
    }
};



 



      
const viewOrders = async (req, res) => {
    try {
        const userId = req.session.user;

        const user = await User.findOne({_id:userId})

         
        const orders=await Order.find({userId:userId})
        .populate('userId')
        .populate({
            path: 'orderedItems.product',
            select: 'productName productImage price productStatus',}).sort({ createdOn: -1 }); 
            

        

      
        res.render("orders",{orders,user})
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).render('orders', { user: req.session.user, orders: [], error: "Failed to fetch orders." });
    }
 
}


const cancelOrder = async (req, res) => {
    try {
        console.log("order:", req.body);
        const { orderId, itemId } = req.body;
        const userId = req.session.user;

        const findUser = await User.findById(userId);
        if (!findUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const findOrder = await Order.findOne({ orderId: orderId });
        if (!findOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        const itemIndex = findOrder.orderedItems.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: "Item not found in the order" });
        }

        const cancelledItem = findOrder.orderedItems[itemIndex];

        // Restore stock only if product exists
        const product = await Product.findById(cancelledItem.product);
        if (product) {
            product.quantity += cancelledItem.quantity;
            await product.save();
        }

        // Handle Wallet Refund for prepaid orders
        if (findOrder.paymentMethod === "razorpay" || findOrder.paymentMethod === "wallet") {
            let wallet = await Wallet.findOne({ userId: userId });

            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0, transactions: [] });
            }

            const refundAmount = cancelledItem.price * cancelledItem.quantity;
            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: "credit",
                amount: refundAmount,
                description: `Refund for cancelled item #${cancelledItem._id} in order #${orderId}`,
                orderId: findOrder._id,
            });

            console.log('form cancel save wallet',wallet)

            await wallet.save();
        }

        // Update only the specific item's status
        findOrder.orderedItems[itemIndex].productStatus = "Cancelled";

        // Check if all items in the order are cancelled
        const allItemsCancelled = findOrder.orderedItems.every(item => item.productStatus === "Cancelled");
        if (allItemsCancelled) {
            findOrder.status = "Cancelled";
        }


        console.log('from cancel findorder',findOrder)
        await findOrder.save();

        return res.status(200).json({ message: "Item cancelled successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};



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
    loadOrderFailed,
    viewOrders,
    cancelOrder,
    returnOreder,
    getOrderDetails,
    verifyRazorpayPayment,
    createRazorpayOrder,
    walletPayment,
    getFailedOrders,
    createFailedOrder,
 




}