const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const Wallet = require('../../models/walletSchema')
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const { search } = require('../../routes/userRouter')



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

        const {firstName,lastName,email,phone,password,confirmPassword,referralCode} = req.body
        console.log()

        if(password !== confirmPassword){
            return res.render('signup',{message:'password do not match'})
        }

        const findUser = await User.findOne({email})

        if(findUser){
            return res.render('signup',{message:'user with this email already exists'})
        }


        let referrer = null

        if(referralCode ){
            referrer = await User.findOne({referralCode:referralCode.trim()})

            if(!referrer){
                return res.render('signup',{message:'Invalid referralCode'})
            }
        }

       

        const otp = generateOtp()

        const emailSend = await sendverificationEmail(email,otp)
        if(!emailSend){
            return res.json("email.error")
        }


        req.session.userOtp = otp
        req.session.userData = {firstName,lastName,email,phone,password,referrerId:referrer?referrer._id:null}

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
            const referralCode = `REF-${Math.floor(100000 + Math.random() * 900000)}`
            const saveUserData = new User({
                firstName:user.firstName,
                lastName:user.lastName,
                email:user.email,
                phone:user.phone, 
                password:passwordHash,
                referralCode:referralCode

            })

            

            const newWallet = new Wallet({
                userId: saveUserData._id,
                balance: 0,
                transactions: []
            });

            await newWallet.save()
                .then(() => console.log("Wallet created successfully!"))
                .catch(err => console.error("Error creating wallet:", err));

           
            saveUserData.wallet = newWallet._id;
            await saveUserData.save().catch(err => console.error("Error updating user with wallet:", err));

            if (user.referrerId && mongoose.Types.ObjectId.isValid(user.referrerId)) {
                const referrer = await User.findById(user.referrerId);
                if (referrer) {
                    referrer.redeemedUsers.push(saveUserData._id);
                    referrer.redeemed = true;
                    await referrer.save().catch(err => console.error("Error saving referrer:", err));

                    let referrerWallet = await Wallet.findOne({ userId: referrer._id });
                    if (referrerWallet) {
                        referrerWallet.balance += 100;
                        referrerWallet.transactions.push({
                            type: "credit",
                            amount: 100,
                            description: "Referral bonus"
                        });
                        await referrerWallet.save().catch(err => console.error("Error updating wallet:", err));
                    } else {
                        referrerWallet = new Wallet({
                            userId: referrer._id,
                            balance: 100,
                            transactions: [{
                                type: "credit",
                                amount: 100,
                                description: "Referral bonus"
                            }]
                        });
                        await referrerWallet.save().catch(err => console.error("Error creating wallet:", err));
                    }
                }
            }

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
        }).populate('category','categoryOffer').sort({createdOn:-1}).skip(skip).limit(limit)

        products.forEach(product => {
            if(product.sizes.length > 0){
                const regularPrice = product.sizes[0].regularPrice
                const productOffer = product.productOffer || 0
                const categoryOffer = product.category ? product.category.categoryOffer || 0:0
                

                
                const maxOffer = Math.max(productOffer,categoryOffer)
              

                const discountAmount = (regularPrice * maxOffer)/100
                
                const salePrice = Math.round(regularPrice - discountAmount)
               
                product.salePrice = salePrice;
                product.regularPrice = regularPrice;
            }else {
                
                product.salePrice = 0;
                product.regularPrice = 0;
            }
            
        })

        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},
            
        })
        const totalPages = Math.ceil(totalProducts/limit)
        const brands = await Brand.find({isBlocked:false})
        const brandsWithIds = brands.map(brand => ({_id:brand._id,brandName:brand.brandName}))
       
        const categoriesWithIds = categories.map(category => ({_id:category._id,name:category.name}))
         
      

        res.render('shoppingPage',{
            user:userData,
            products:products,
            category:categoriesWithIds,
            brand:brandsWithIds,
            totalProducts:totalProducts,
            currentPage:page,
            totalPages:totalPages,
            selectedCategory:"",
            selectedBrand:"",
             minPrice: "",
             maxPrice: ""
        })
        
    } catch (error) {
        res.redirect('/pageNotFound')
    }
   
}




 

 

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category ? (Array.isArray(req.query.category) ? req.query.category : [req.query.category]) : [];
        const brand = req.query.brand ? (Array.isArray(req.query.brand) ? req.query.brand : [req.query.brand]) : [];
        const minPrice = req.query.minPrice ? parseInt(req.query.minPrice) : 0;
        const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : Infinity;
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 6;
        const startIndex = (currentPage - 1) * itemsPerPage;

        // Find all categories & brands
        const categories = await Category.find({ isListed: true }).lean();
        const brands = await Brand.find({isBlocked:false}).lean();

        // Convert brand ObjectIds to brand names
        const brandNames = await Brand.find({
            _id: { $in: brand.map(id => new mongoose.Types.ObjectId(id)) }
        }).lean();

        // Normalize brand names (trim and handle potential case issues)
        const normalizedBrandNames = brandNames.map(b => b.brandName.trim());

        console.log('Original Brand ObjectIds:', brand);
        console.log('Normalized Brand Names:', normalizedBrandNames);

        // Query for filtering products
        let query = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };

        // Price filtering
        query.$or = [
            { "sizes.salePrice": { $gte: minPrice, $lte: maxPrice } },
            { "sizes.regularPrice": { $gte: minPrice, $lte: maxPrice } }
        ];

        // Category filtering
        if (category.length > 0) {
            query.category = { 
                $in: category.map(id => new mongoose.Types.ObjectId(id)) 
            };
        }

        // Brand filtering with case-insensitive match
        if (normalizedBrandNames.length > 0) {
            query.brand = { 
                $in: normalizedBrandNames.map(name => new RegExp(`^${name}$`, 'i')) 
            };
        }

        console.log('Final Query:', JSON.stringify(query, null, 2));

        // Find filtered products with pagination
        const [findProducts, totalProducts] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(startIndex)
                .limit(itemsPerPage)
                .lean(),
            Product.countDocuments(query)
        ]);

        console.log('Total Products:', totalProducts);
        console.log('Filtered Products:', findProducts.length);

        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        res.render('shoppingPage', {
            user: user,
            products: findProducts,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            selectedCategory: category || [],
            selectedBrand: brand || [],
            minPrice: req.query.minPrice || "",
            maxPrice: req.query.maxPrice || ""
        });
    } catch (error) {
        console.error('Error in filterProduct:', error);
        res.redirect('/pageNotFound');
    }
};





const searchProducts = async (req,res)=>{
    try {

        const user = req.session.user
        const userData = await User.findOne({_id:user})
        let search = req.body.query

        const brands = await Brand.find({}).lean()
        const categories = await Category.find({isListed:true}).lean()
        const categoryIds = categories.map(category => category._id.toString())
        let searchResult = []


        if(req.session.filteredProducts && req.session.filteredProducts.length > 0){
            searchResult = req.session.filteredProducts.filter(product => product.productName.toLowerCase().includes(search.toLowerCase()) )
        }else{
            searchResult = await Product.find({
                productName:{$regex:".*"+search+".*",$options:"i"},
                isBlocked:false,
                quantity:{$gt:0},
                category:{$in:categoryIds}
            })
        }

        searchResult.sort((a,b) => new Date(b.createdOn) - new Date(a.createdOn))
        let itemsPerPage = 6
        let currentPage = parseInt(req.query.page)||1
        let startIndex = (currentPage-1)*itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(searchResult.length/itemsPerPage)
        const currentProduct = searchResult.slice(startIndex,endIndex)

        res.render('shoppingPage',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            count:searchResult.length

        })

        
    } catch (error) {
        
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
    searchProducts,
   

}