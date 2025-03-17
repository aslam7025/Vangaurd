const Product = require('../../models/productSchema')
const Categroy = require('../../models/categorySchema')
const User = require('../../models/userSchema')




const productDetails = async (req,res) => {
    try {
        
        const userId = req.session.user
        const userData = await User.findById(userId)
        const productId = req.query.id
        const product = await Product.findById(productId).populate('category')

        if (!product) {
            return res.redirect('/pageNotFound');
        }

        const findCategory = product.category
        const categoryOffer = findCategory ?.categoryOffer || 0
        const productOffer = product.productOffer || 0
        const totalOffer = categoryOffer + productOffer
        const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : []
        
        res.render('product-detail',{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory,
            sizes:sizes
        })



    } catch (error) {
        console.error(error,'Error for fetching product details')


        
    }
}



module.exports ={
    productDetails,

}