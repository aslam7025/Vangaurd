const mongoose = require('mongoose')
const {Schema} = mongoose
const { v4: uuidv4 } = require('uuid');
 
const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId: {  
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        size: { 
            type: String
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {  
        addressType: String,
        name: String,
        city: String,
        landMark: String,
        state: String,
        pincode: Number,
        phone: Number,
        altPhone: Number
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'razorpay','wallet'],
        
        
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned','Confirmed']
    },
    returnReason: {  
        type: String,
        default: null
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApp: {
        type: Boolean,
        default: false
    }
});


const Order = mongoose.model("Order",orderSchema)
module.exports = Order