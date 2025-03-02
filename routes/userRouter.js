const express = require('express')
const router = express.Router()
const userController = require("../controllers/user/userController")
const profileControllers = require('../controllers/user/profileController')
const passport = require('passport')
const {userAuth} = require('../middlewares/auth')


router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/shop',userAuth,userController.loadShoppingPage)
router.get('/filter',userAuth,userController.filterProduct)

router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)



router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res) => {
    res.redirect('/')
})


router.get('/login',userController.loadLogin)
router.post('/login',userController.login)

router.get('/logout',userController.logout)


router.get('/forgot-password',profileControllers.getForgotPasspage)
router.post('/forgot-email-valid',profileControllers.forgotEmailValid)
router.post('/verify-passForgot-otp',profileControllers.verifyForgotPassOtp)
router.get('/reset-password',profileControllers.getResetPassPage)
router.get('/resend-forgot-otp',profileControllers.resendOtp)
router.post('/reset-password',profileControllers.postNewPassword)





module.exports = router