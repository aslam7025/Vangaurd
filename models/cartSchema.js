const mongoose = require('mongoose')
const Product = require('./productSchema')
const { type } = require('express/lib/response')
const {Schema} = mongoose



const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        productId:{
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
            
        },
        size:{
            type:String
        },
        totalPrice:{
            type:Number,
  
        },   
         productImage:{
          type:[String],
    },
    }]
})


const Cart = mongoose.model('Cart',cartSchema)
module.exports = Cart