const User = require('../../models/userScheema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')



const pageNotFound = async (req,res) => {
    try{

        res.render('page-404')
    }catch(err) {
        res.redirect('/pageNotFound')

    }
}





const loadHomepage = async (req,res)=> {
    try{

        const user = req.session.user
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({isBlocked:false,category:{$in:categories.map((category) => category._id)},quantity:{$gt:0}})
        
        productData.sort((a,b) => new Date(b.createdOn)-new Date(a.createdOn))
        productData = productData.slice(0,4)

        if(user){
            const userData = await User.findOne({_id:user})
          
            res.render('home',{user:userData,products:productData})
        }else{
            return res.render('home',{products:productData})
        }

       
    }catch(err){
        console.log('home page not found')
        res.status(500).send('server error')

    }
}


const loadSignup = async (req,res) => {
    try{
        return res.render('signup')
    }catch(err){
        console.log('Home page not loading:',err)
        res.status(500).send('Server Error')
    }
}


function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}

async function sendverificationEmail(email,otp) {
    try{

        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:'verify your account',
            text:`${otp}`,
            html:`<b> Your OTP : ${otp}</b>`,
        })

        return info.accepted.length > 0 

    }catch(error){
        console.error("Error sending email",error)
        return false

    }
    
}




const signup = async (req,res)=> {
    
    try{

        const {firstName,lastName,email,phone,password,confirmPassword} = req.body

        if(password !== confirmPassword){
            return res.render('signup',{message:'password do not match'})
        }

        const findUser = await User.findOne({email})

        if(findUser){
            return res.render('signup',{message:'user with this email already exists'})
        }

        const otp = generateOtp()

        const emailSend = await sendverificationEmail(email,otp)
        if(!emailSend){
            return res.json("email.error")
        }

        req.session.userOtp = otp
        req.session.userData = {firstName,lastName,email,phone,password}

        res.render('verify-otp')
        console.log("OTP sent",otp)
       


 

    }catch(err){
        console.error("signup error",err)
        res.redirect('/pageNotFound')

    }
}

const securePasswod = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password,10)

        return passwordHash
        
    } catch (error) {
        
    }
    
}


const verifyOtp = async (req,res) => {
    try {

        const {otp} = req.body

     

        if(otp === req.session.userOtp){
            const user = req.session.userData
            const passwordHash = await securePasswod(user.password)
            const saveUserData = new User({
                firstName:user.firstName,
                lastName:user.lastName,
                email:user.email,
                phone:user.phone, 
                password:passwordHash

            })

            await saveUserData.save()
            req.session.user = saveUserData._id
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP, Please try again later"})
        }
        
    } catch (error) {

        console.error("Error verifying OTP ",error)
        res.status(500).json({success:false,message:"An error Occure"})
        
    }
}

const resendOtp = async (req,res) =>{
    try {

        const {email} = req.session.userData
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp()
        req.session.userOtp = otp

        const emailsend = await sendverificationEmail(email,otp)
            if(emailsend){
                console.log('Resend OTP',otp)
                res.status(200).json({success:true,message:"OTP Resend successfully",})

            }else{
                res.status(500).json({success:false,message:"Failed to Resend OTP. Please try again"})
            }
        
        
    } catch (error) {
        console.error('Error resending OTP',error)
        res.status(500).json({success:false,message:'Internal server Error. Please try again'})
        
    }
    
}


const loadLogin = async (req,res) => {
    try {
        
        if(!req.session.user){
            return res.render('login')
        }else{
            res.redirect('/')
        }
    } catch (error) {
       // res.redirect('/pageNotFound')
    }
}


const login = async (req,res) => {
    try {
        const {email,password} =req.body

        const findUser = await User.findOne({isAdmin:0,email:email})

        if(!findUser){
            return res.render('login',{message:'User Not Found'})
        }
        if(findUser.isBlocked){
            return res.render('login',{message:'User is blocked by admin'})
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password)

        if(!passwordMatch){
            return res.render('login',{message:'Incorrect Password'})
        }

        req.session.user = findUser._id
        res.redirect('/')


    } catch (error) {

        console.error('login error',error)
        res.render('login',{message:'login failed Please try again later'})
        
    }
}


const logout = async (req,res) => {
    try {
        req.session.destroy((err) => {
            if(err){
                console.log('session destruction error',err.message)
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
    } catch (error) {

        console.log('Logout error',error)
        res.redirect('/pageNotFound')
        
    }
}


const loadShoppingPage = async (req,res) => {
    try {

        const user = req.session.user
        const userData = await User.findOne({_id:user})
        const categories = await Category.find({isListed:true})
        const categoryIds = categories.map(category => category._id.toString()) 
        const page = parseInt(req.query.page) || 1
        const limit = 9
        const skip = (page-1)*limit
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},
        }).sort({createdOn:-1}).skip(skip).limit(limit)

        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},
            
        })
        const totalPages = Math.ceil(totalProducts/limit)
        const brands = await Brand.find({isBlocked:false})
        const categoriesWithIds = categories.map(category => ({_id:category._id,name:category.name}))

        res.render('shoppingPage',{
            user:userData,
            products:products,
            category:categoriesWithIds,
            brand:brands,
            totalProducts:totalProducts,
            currentPage:page,
            totalPages:totalPages,
            selectedCategory:"",
            selectedBrand:""

            

        })
        
    } catch (error) {
        res.redirect('/pageNotFound')
    }
   
}


const filterProduct = async (req,res) => {
    try {
        const user = req.session.user
        const category = req.query.category
        const brand = req.query.brand
        const findCategory = category ? await Category.findOne({_id:category}) :null
        const findBrand = brand ? await Brand.findOne({_id:brand}):null
        const brands = await Brand.find({}).lean()
        const query = {
            isBlocked:false,
            quantity:{$gt:0}
        }


        if(findCategory){
            query.category = findCategory._id
            

        }
        if(findBrand){
            query.brand = findBrand._id
        }

        let findProducts = await Product.find(query).lean()
        findProducts.sort((a,b) => new Date(b.createdOn)-new Date(a.createdOn))
        const categories = await Category.find({isListed:true})
        let itemsPerPage = 6
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage -1)* itemsPerPage
        let endIndex = startIndex+itemsPerPage
        let totalPages = Math.ceil(findProducts.length/itemsPerPage)
        const currentProduct = findProducts.slice(startIndex,endIndex)
        let userData = null

        if(user){
            userData = await User.findOne({_id:user})
            if(userData){
                const searchEntry = {
                    category : findCategory ? findCategory._id:null,
                    brand: findBrand ? findBrand.brandName:null,
                    searchedOn : new Date()

                }

                userData.serachHistory.push(searchEntry)
                await userData.save()
            }
        }
        console.log("Selected Category:", category);
        console.log("Selected Brand:", brand);


        req.session.filteredProducts = currentProduct
        res.render('shoppingPage',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            selectedCategory:category || "",
            selectedBrand : brand ||""

        })




    } catch (error) {

        res.redirect('/pageNotFound')
        
    }
}


module.exports ={
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    filterProduct,
}