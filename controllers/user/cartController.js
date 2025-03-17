const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Cart = require('../../models/cartSchema')
const mongodb = require('mongodb')
const mongoose = require('mongoose')
const { productDetails } = require('./productController')










// const getCart = async(req,res)=>{
//     try {


//         const id = req.session.user;
//         if (!id) {
//             return res.redirect("/login"); // Redirect to login if user is not authenticated
//         }
 
//         const user = await User.findOne({ _id: id });

//        // console.log(user)
//         const productIds = user.cart.map((item) => item.productId);
//         const products = await Product.find({ _id: { $in: productIds } });
//         const objectid = await new mongoose.ObjectId(id);

//         console.log(objectid)

//         let data = await User.aggregate([
//           { $match: { _id: objectid } },
//           { $unwind: "$cart" },
//           {
//             $project: {
//               proId: { $toObjectId: "$cart.productId" },
//               quantity: "$cart.quantity",
//             },
//           },
//           {
//             $lookup: {
//               from: "products",
//               localField: "proId",
//               foreignField: "_id",
//               as: "productDetails",
//             },
//           },
//         ]);
//         console.log('data :',data)

//         let quantity = 0;
//         for (const i of user.cart) {
//           quantity += i.quantity;
//         }

//         let grandTotal = 0;
//         for (let i = 0; i < data.length; i++) {
//           if (products[i]) {
//             grandTotal += data[i].productDetails[0].salePrice * data[i].quantity;
//           }
//           req.session.grandTotal = grandTotal;
//         }

//         res.render("cart", {
//           user,
//           quantity,
//           data,
//           grandTotal,
//         });

//       } catch (error) {
//         res.redirect("/pageNotFound");
//       }
    
// }



const getCart = async(req,res)=>{
  try {
      const userId = req.session.user;
      if (!userId) {
          return res.redirect("/login");
      }

      const user = await User.findOne({ _id: userId });
      const cart = await Cart.findOne({ userId });
      
      if (!cart || cart.items.length === 0) {
          return res.render("cart", {
              user,
              quantity: 0,
              data: [],
              grandTotal: 0
          });
      }

      // Get product details for items in cart
      const productIds = cart.items.map(item => item.productId);
      const products = await Product.find({ _id: { $in: productIds } });
      
     
      const data = [];
      for (const item of cart.items) {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        if (product) {
          data.push({
            quantity: item.quantity,
            productDetails: [{
              _id: product._id,
              productName: product.productName,
              salePrice: item.price,  
              productImage: product.productImage || ['default-image-path.jpg']  
            }]
          });
        }
      }

      // Calculate total quantity and grand total
      const quantity = cart.items.reduce((total, item) => total + item.quantity, 0);
      const grandTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
      
      req.session.grandTotal = grandTotal;

      res.render("cart", {
          user,
          quantity,
          data,
          grandTotal,
         
      });

  } catch (error) {
      console.error("Error getting cart:", error);
      res.redirect("/pageNotFound");
  }
}


const addTocart = async (req,res)=>{
  try {

    const userId = req.session.user
    const {productId , quantity = 1,size} = req.body
    console.log('form wishlist:',productId)
   
 

    const product = await Product.findById(productId)

    if(!product){
      return res.status(404).json({message:'product not found'})
    }
     

    const selectedSize = product.sizes.find(s => s.size === size)

    if(!selectedSize){
      return res.status(400).json({message:'Invalid size selected'})
    }

    const salePrice =  selectedSize.salePrice
    console.log(salePrice)

    let cart = await Cart.findOne({userId})

    if(!cart){
      cart = new Cart({
        userId,
        items:[]
      })
    }


    const existingItem = cart.items.find(item => item.productId.toString() === productId && item.size === size)

    if(existingItem){
      existingItem.quantity += quantity
      existingItem.totalPrice = existingItem.quantity * salePrice
      console.log(existingItem.totalPrice)
    }else{

      cart.items.push({
        productId,
        size,
        quantity,
        price:salePrice,
        totalPrice:quantity * salePrice,
        productImage:product.productImage
      })
    }
    


    await cart.save()

   
   // res.status(200).json({ success:true,message: "Product added to cart", cart });
    res.redirect('/cart')
      


    
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.redirect('/pageNotFound')
    
  }
}



const deleteProduct = async (req, res) => {
  try {

    console.log(req.query)
    const productId = req.query.id;
    console.log(productId)

    const userId = req.session.user;

    if (!userId) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({userId});
    if (!cart) {
      return res.redirect("/cart");
    }

    console.log(cart)


    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.redirect("/cart");
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.redirect("/cart");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
 


 

const updateQuantity = async (req, res) => {
  try {
      const userId = req.session.user;
      const { productId, quantity } = req.body;

      let cart = await Cart.findOne({ userId });
      if (!cart) return res.status(400).json({ success: false, message: "Cart not found" });

      let item = cart.items.find(item => item.productId.toString() === productId);
      if (!item) return res.status(404).json({ success: false, message: "Product not found in cart" });

      // Update quantity and total price for the item
      item.quantity = quantity;
      item.totalPrice = item.price * quantity;

      await cart.save();

      // Recalculate grand total
      const grandTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

      res.json({ success: true, grandTotal });
  } catch (error) {
      console.error("Error updating quantity:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
  }
};

 

module.exports = {
    getCart,
    addTocart,
    deleteProduct,
    updateQuantity,



}