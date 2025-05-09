const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Product = require('../../models/productSchema')
const Wallet = require('../../models/walletSchema')
const Coupon = require('../../models/couponSchema')
const Order = require('../../models/orderSchema')
const mongoose = require('mongoose')
 





const getCheckOut = async (req,res) =>{
    try {

    const userId = req.session.user
    
    if(!userId){
        res.render('login',{message:'Please login to access your cart'})
    }

 
    let cart = await Cart.findOne({userId}).populate({
        path:'items.productId',
        model:'Product'
    })

    if (!cart) {
        cart = { items: [] };
    }


    const userAddresses = await Address.findOne({userId})

    const currentDate = new Date()
    const coupons = await Coupon.find({
        expireOn:{$gt:currentDate},
        isList:true,
        $or:[

           { UsageLimit:{$gt: 0} },
           {UsageLimit:{ $exists:false} },
           { isList:false }
        ]
    })
    

    


    const userData = await User.findById(userId)
 
 let Tax_Rate = 0.1

 let totalPrice = 0
 let taxAmount = 0
 if(cart && cart.items){
    totalPrice = cart.items.reduce((sum,item) => sum + item.totalPrice,0 )
    taxAmount = totalPrice * Tax_Rate

 }
    


        res.render('checkout',{
            RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
            cart,
            addresses:userAddresses ? userAddresses.address : [],
            title:'Checkout',
            user:userData,
            coupons:coupons,
           taxAmount,
          totalPrice
        })
        
    } catch (error) {
        console.log('checkout page error',error)

        res.redirect('/cart')
        
    }
}



const addAddress = async (req,res)=> {
    try {

        

 
        const userId = req.session.user;
        const { addressType ,name, city, landMark, state, pincode, phone} = req.body;

         
        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            
            userAddress = new Address({
                userId,
                address: [{
                    addressType,
                    name,
                    city,
                    state,
                    pincode,
                    landMark,
                    phone,
                    
                    
                }]
            });
        } else {
             
            userAddress.address.push({
                addressType,
                name,
                city,
                landMark,
                state,
                pincode,
                phone,
                
               
            });
        }

        await userAddress.save();
       
        res.json({success:true,message:"address added successfully"})
 
  
        
    } catch (error) {
        
        console.error('Add address error:', error);
      
        res.redirect('/checkOut');
    }
}


 
const editAddress = async (req, res) => {
    try {
        const { addressId, name, addressType, city, landMark, state, pincode, phone } = req.body;

        console.log('Edit address:', addressId, name, addressType, city, landMark, state, pincode, phone);

        if (!addressId) {
            return res.json({ success: false, message: "Address ID is required" });
        }

       
        const userAddress = await Address.findOne({ "address._id": addressId });

        if (!userAddress) {
            return res.json({ success: false, message: "Address not found" });
        }

         
        const addressToUpdate = userAddress.address.id(addressId);
        if (!addressToUpdate) {
            return res.json({ success: false, message: "Address not found in user's address list" });
        }

        addressToUpdate.name = name;
        addressToUpdate.addressType = addressType;
        addressToUpdate.city = city;
        addressToUpdate.landMark = landMark;
        addressToUpdate.state = state;
        addressToUpdate.pincode = pincode;
        addressToUpdate.phone = phone;

        await userAddress.save(); // Save the document after modifying the nested array

        res.json({ success: true, message: "Address updated successfully", address: addressToUpdate });

    } catch (error) {
        console.error("Edit Address Error:", error);
        res.json({ success: false, message: "Failed to update address" });
    }
};



module.exports = {
    getCheckOut,
    addAddress,
    editAddress,


}