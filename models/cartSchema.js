const mongoose = require('mongoose')
const Product = require('./productScheema')
const {Schema} = mongoose



const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        ProductId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            rquired:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:'placed'
        },
        cancellationReason:{
            type:String,
            default:"none"
        }
    }]
})


const Cart = mongoose.model('Cart',cartSchema)
module.exports = Cart