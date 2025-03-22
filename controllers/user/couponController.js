const Coupon = require('../../models/couponSchema')
const Cart = require('../../models/cartSchema')







const applyCoupon = async (req,res) => {
    try {


        const { couponCode } = req.body;
        const userId = req.user._id; 

        
        if (!couponCode) {
            return res.json({ success: false, message: "Coupon code is required." });
        }

        
        const coupon = await Coupon.findOne({ name: couponCode, isList: true });
        if (!coupon) {
            return res.json({ success: false, message: "Invalid or inactive coupon." });
        }

        
        const currentDate = new Date();
        if (coupon.expireOn < currentDate) {
            return res.json({ success: false, message: "Coupon has expired." });
        }

    
        const userCart = await Cart.findOne({ userId }).populate('items.productId');
        if (!userCart || userCart.items.length === 0) {
            return res.json({ success: false, message: "Cart is empty." });
        }
        
        const cartTotal = userCart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        

        
        if (cartTotal < coupon.minimumPrice) {
            return res.json({ 
                success: false, 
                message: `Minimum cart total must be ₹${coupon.minimumPrice} to apply this coupon.` 
            });
        }

        // Apply discount
        const discount = coupon.offerPrice;
        const finalPrice = cartTotal - discount;
        console.log('final apply:',finalPrice)

        return res.json({
            success: true,
            couponName: couponCode,
            discount: discount,
            finalPrice: finalPrice 
        });
        
    } catch (error) {
        
    }
}



const removeCoupon = async (req,res) => {
    try {
        req.session.appliedCoupon = null; // Remove the coupon from session
        return res.json({ success: true, message: "Coupon removed successfully" });
    } catch (error) {
        console.error("Error removing coupon:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}






module.exports = {
    applyCoupon,
    removeCoupon,

}