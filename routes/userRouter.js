const express = require('express')
const router = express.Router()
const userController = require("../controllers/user/userController")
const profileController = require('../controllers/user/profileController')
const productController = require('../controllers/user/productController')
const cartController = require('../controllers/user/cartController')
const checkoutController = require('../controllers/user/checkoutController')
const orderController = require('../controllers/user/orderController')
const couponController = require('../controllers/user/couponController')
const wishlistController = require('../controllers/user/wishlistController')
const walletController = require('../controllers/user/walletController')
const passport = require('passport')
const {userAuth} = require('../middlewares/auth')





router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/shop',userAuth,userController.loadShoppingPage)
router.get('/filter',userAuth,userController.filterProduct)
//router.get('/filterPrice',userAuth,userController.filterByPrice)
router.post('/search',userAuth,userController.searchProducts)


//register && login
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)



router.get('/login',userController.loadLogin)
router.post('/login',userController.login)

router.get('/logout',userAuth,userController.logout)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res) => {
    req.session.user=req.user._id;
    res.redirect('/')

})




// Profile

router.get('/forgot-password',userAuth,profileController.getForgotPasspage)
router.post('/forgot-email-valid',userAuth,profileController.forgotEmailValid)
router.post('/verify-passForgot-otp',userAuth,profileController.verifyForgotPassOtp)
router.get('/reset-password',userAuth,profileController.getResetPassPage)
router.post('/reset-password',userAuth,profileController.postNewPassword)
router.get('/resend-forgot-otp',userAuth,profileController.resendOtp)
router.get('/userProfile',userAuth,profileController.userProfile)
router.get('/change-email',userAuth,profileController.changeEmail)
router.post('/change-email',userAuth,profileController.changeEmailValid)
router.post('/verify-email-otp',userAuth,profileController.verifyOtpEmail)
router.post('/update-email',userAuth,profileController.updateEmail)
router.get('/change-password',userAuth,profileController.changePassword)
router.post('/change-password',userAuth,profileController.changePasswordValid)
router.post('/verify-changePassword-otp',userAuth,profileController.verifyChangePassOtp)




router.get('/productDetails',userAuth,productController.productDetails)



//address management
router.get('/addAddress',userAuth,profileController.addAddress)
router.post('/addAddress',userAuth,profileController.postAddAddress)
router.get('/editAddress',userAuth,profileController.editAddress)
router.post('/editAddress',userAuth,profileController.postEditAddress)
router.get('/deleteAddress',userAuth,profileController.deleteAddress)



//cart management
router.get('/cart',userAuth,cartController.getCart)
router.post('/addTocart',userAuth,cartController.addTocart)
router.get('/deleteItem',userAuth,cartController.deleteProduct)
router.post('/updateQuantity',userAuth,cartController.updateQuantity)

//checkout
router.get('/checkOut',userAuth,checkoutController.getCheckOut)
router.post('/add-address',userAuth,checkoutController.addAddress )
router.post('/edit-address',userAuth,checkoutController.editAddress)




//order management

router.post('/orderPlaced',userAuth,orderController.orderPlaced)
router.get('/order-success',userAuth,orderController.loadOrderSuccess)
router.get('/orders',userAuth,orderController.viewOrders)
router.post('/cancel-order',userAuth,orderController.cancelOrder)
router.post('/return-order/:orderId',userAuth,orderController.returnOreder)
router.get('/order-details/:orderId',userAuth,orderController.getOrderDetails)

//razorpay
router.post('/create-razorpay-order',userAuth,orderController.createRazorpayOrder)
router.post('/verify-razorpay-payment',userAuth,orderController.verifyRazorpayPayment)

//wallet
router.post('/walletPayment',userAuth,orderController.walletPayment)




//coupon management 
router.post('/apply-coupon',userAuth,couponController.applyCoupon)
router.post('/remove-coupon',userAuth,couponController.removeCoupon)



//wishlist management
router.get('/wishlist',userAuth,wishlistController.getWishlist)
router.post('/add-wishlist',userAuth,wishlistController.addToWishlist)
router.delete('/remove-wishlist',userAuth,wishlistController.removeWishlist)


//wallet mangement
router.get('/wallet',userAuth,walletController.getWallet)


module.exports = router