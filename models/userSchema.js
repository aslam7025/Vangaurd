const mongoose = require('mongoose')
const {Schema} = mongoose



const userSchema = new Schema({
    firstName:{
        type:String,
        required:true
    },
    lastName:{
        type:String,
        required:false
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true

    },
    password:{
        type:String,
        required:false,

    },
    isBlocked:{
        type:Boolean,
        default:false,

    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart: [{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wallet",
        default: null, 
    },
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"

    }],
    createdOn:{
        type:Date,
        default:Date.now,
        
    },
    referralCode:{
        type:String,
        unique:true,
        sparse : true
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User",
        

    }],
    searchHistory: [{
        category: [{
            type: Schema.Types.ObjectId,
            ref: "Category"
        }],
        brand: [{
            type: Schema.Types.ObjectId,
            ref: "Brand"
        }],
        searchedOn: {
            type: Date,
            default: Date.now
        }
    }]
})


const User = mongoose.model("User",userSchema)
module.exports = User