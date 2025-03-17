const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const User = require('../../models/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
 



const getProductAddPage = async (req,res) => {

    try {
        
        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked:false})
        res.render('productAdd',{
            cat:category,
            brand:brand,

        })

    } catch (error) {

        res.redirect('/pageerror')
        
    }
}



const addProducts = async (req,res) => {
    try {
        const products = req.body
        const productExists = await Product.findOne({
            productName:products.productName
        })

        if(!productExists){
            const images = []

            if(req.files && req.files.length > 0){
                for(let i = 0 ; i<req.files.length ; i++){
                    const originalImagePath = req.files[i].path

                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename)
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
                    images.push(req.files[i].filename)
                }
            }

            const categoryId = await Category.findOne({name:products.category})
            if(!categoryId){
                return res.status(400).json('Invalid category name')
            }

                       // **Processing sizes correctly**
                       let sizes = [];
                       if (Array.isArray(products.size)) {
                           for (let i = 0; i < products.size.length; i++) {
                               sizes.push({
                                   size: products.size[i],
                                   regularPrice: products.regularPrice[i], // Regular price for each size
                                   salePrice: products.salePrice[i] // Sale price for each size
                               });
                           }
                       } else {
                           // If only one size is provided (not an array)
                           sizes.push({
                               size: products.size,
                               regularPrice: products.regularPrice,
                               salePrice: products.salePrice
                           });
                       }
           
                       const newProduct = new Product({
                           productName: products.productName,
                           description: products.description,
                           brand: products.brand,
                           category: categoryId._id,
                           quantity: products.quantity,
                           sizes: sizes, // **Correctly storing sizes with prices**
                           productImage: images,
                           status: 'Avilable'
                       });


            // const newProduct = new Product({
            //     productName:products.productName,
            //     description:products.description,
            //     brand:products.brand,
            //     category:categoryId._id,
            //     regularPrice:products.regularPrice,
            //     salePrice:products.salePrice,
            //     createdOn:new Date(),
            //     quantity:products.quantity,
            //     size: Array.isArray(products.size) ? products.size : [products.size],
            //     productImage:images,
            //     status:'Avilable',

            // })

            await newProduct.save()
            return res.redirect('/admin/addProducts')

            
        }else{
            return res.status(400).json('Product already exist,please try with another name')
        }
    } catch (error) {

        console.error('Error saving product',error)
        return res.redirect('/admin/pageerror')
        
    }
}



const getAllProducts = async (req,res)=>{

    try {
        
        const search = req.query.search || ""
        const page = req.query.page || 1
        const limit = 4

        const productData = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*" + search + ".*","i")}},
                {brand:{$regex:new RegExp(".*" + search + ".*","i")}}
            ],
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .populate('category')
        .exec()

        const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*" + search + ".*","i")}},
                {brand:{$regex:new RegExp(".*" + search + ".*","i")}}
            ],
        }).countDocuments()

        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked:false})

        if(category && brand){
            res.render('admin-products',{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brand:brand,
                sizes:productData.sizes
            })
        }else{
            res.render('page-404')
        }

    } catch (error) {
        console.error('Error i getAllproducts',error)
        res.redirect('/pageerror')
        
    }

}


const addProductOffer = async (req,res) => {
    try {
        const {productId,percentage} = req.body
        console.log('admin side ',productId,percentage)


        if (!percentage || percentage <= 0 || percentage > 100) {
            return res.json({ status: false, message: 'Invalid offer percentage' });
        }

        const findProduct = await Product.findOne({_id:productId})
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }


        const findCategory = await Category.findOne({_id:findProduct.category})
        if (!findCategory) {
            return res.json({ status: false, message: 'Category not found' });
        }

        if(findCategory.categoryOffer > percentage){
            return res.json({status:false,message:'This product category already has a offer'})

        }

        findProduct.sizes = findProduct.sizes.map(size => {
            size.salePrice = Math.floor(size.regularPrice * (1 - percentage / 100))
            return size;
        });

         findProduct.productOffer = parseInt(percentage)
        await findProduct.save()

        findCategory.categoryOffer = 0 
        await findCategory.save()
        res.json({status:true,message:'Offer added successfully'})

    } catch (error) {

        res.redirect('/pageerror')
        res.status(500).json({status:false,message:"Internal server error"})
        
    }
}


const removeProductOffer = async (req,res) => {
    try {
        
        const {productId} = req.body

        const findProduct = await Product.findOne({_id:productId})
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }

        const percentage = findProduct.productOffer
        if (percentage === 0) {
            return res.json({ status: false, message: 'No offer to remove' });
        }

        findProduct.sizes = findProduct.sizes.map(size => {
            size.salePrice = size.regularPrice
            return size;
        });

         findProduct.productOffer = 0 
        await findProduct.save()
        res.json({status:true,message:'Product offer removed successfully'})


    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal server error' });
        res.redirect('/pageerror')
        
    }
}


const blockProduct = async (req,res)=>{
    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
        
    }
}


const unblockProduct = async (req,res) => {
    try {
        let id = req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
    }
}



const getEditProduct = async (req,res) => {
    try {
        const id = req.query.id



        const product = await Product.findOne({_id:id})

        if (!product.images) {
            product.images = [];
        }



        const category = await Category.find({})
        const brand = await Brand.find({})

        res.render('editProduct',{
            product:product,
            categories:category,
            brand:brand,
        })

    } catch (error) {
        res.redirect('/pageerror')
        
    }
}



const editProduct = async (req,res) => {
    try {
        const id = req.params.id
        const product = await Product.findOne({_id:id})
        const data = req.body
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })

        if(existingProduct){
            return res.status(400).json({error:"Product with this name already exists try with another name"})

        }

        const images = []

        if(req.files && req.files.length > 0 ){
            for(let i = 0 ; i< req.files.length ; i++ ){
                images.push(req.files[i].filename)
            }
        } 



        const parsedSizes = Array.isArray(data.size)
        ? data.size.map((size, index) => ({
            size: String(size),  // Ensure size is a string
            regularPrice: Number(data.regularPrice[index] || 0),
            salePrice: Number(data.salePrice[index] || 0)
        }))
        : [{
            size: String(data.size),
            regularPrice: Number(data.regularPrice || 0),
            salePrice: Number(data.salePrice || 0)
        }];


        const updateFields = {
            productName:data.productName,
            description:data.description,
            brand:data.brand,
            category:product.category,
            sizes:parsedSizes,
            quantity:data.quantity,

            
        }

        if(req.files.length > 0){
            updateFields.$push  = {productImage:{$each:images}}
        }
        await Product.findByIdAndUpdate(id,updateFields,{new:true})
        res.redirect('/admin/products')

    } catch (error) {

        console.error(error)
        res.redirect('/pageerror')
        
    }
}



const deleteSingleImage = async (req,res) => {
    try {
        const {imageNameToServer,productIdToServer} = req.body
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagePath = path.join('public','uploads','re-image',imageNameToServer)


        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath)
            console.log(`Image ${imageNameToServer} deleted successfully`)
        }else{
            console.log(`Image ${imageNameToServer} not found`)
        }
        res.send({status:true})

    } catch (error) {

        res.redirect('/pageerror')
        
    }
}






module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,


}
