const { name } = require('ejs')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
 


const categoryInfo = async (req,res) => {
    try {

        let search = ""
        if(req.query.search){
            search = req.query.search || ""
        }


         
        let page = 1 
        if(req.query.page){
            page = parseInt(req.query.page,10)||1
        }

        const limit = 4 

        const categoryData = await Category.find( {name:{$regex:".*"+search+".*",$options:"i"}})
         
        .skip((page-1)*limit)
        .limit(limit)
        .exec()


        const totalCategories = await Category.countDocuments()
        const totaPages = Math.ceil(totalCategories/limit)
        res.render('admin-categories',
            {cat:categoryData,
                search,
                currentPage:page,
                totalPages:totaPages,
                totalCategories:totalCategories,
            }) 
        
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
        
    }
}


const addCategory = async (req,res) =>{
    const {name,description} = req.body
    try {
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory = new Category ({
            name,
            description,
        })

        await newCategory.save()
        return res.json({message:"Category added successfully"})


    } catch (error) {
        
        return res.status(500).json({error:"Internal Server error"})
    }
}


const addCategoryOffer = async (req,res)=>{
    try {
        const percentage = parseInt(req.body.percentage)
        const categoryId = req.body.categoryId

        console.log(categoryId)

        const category = await Category.findById(categoryId)

        if(!category){
            return res.status(404).json({status:false,message:"Category not found"})
        }

        const products = await Product.find({category:categoryId})
        const hasProductOffer = products.some(product => product.productOffer > percentage)

        if(hasProductOffer){
            return res.json({status:false,message:"Products within this category already have product off"})
        }
        category.categoryOffer = percentage
        await category.save()
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}})

        for(const product of products){
            product.productOffer = percentage
            product.salePrice =  Math.floor(product.regularPrice * (1 - percentage / 100))
            await product.save()
        }
        res.json({status:true,message:"Category Offer added successfully"})
    } catch (error) {
        res.status(500).json({status:false,message:'Internal Server Error'})
        
    }
}


const removeCategoryOffer = async (req,res) => {
    try {
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)


        if(!category){
            return res.status(404).json({status:false,message:'Category not found'})
        }

        const percentage = category.categoryOffer
        const products = await Product.find({category:category._id})

        if(products.length > 0 ){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice * (percentage/100))
                product.productOffer = 0
                await product.save()

            }
        }

        category.categoryOffer = 0 
        await category.save()
        res.json({status:true})

    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
    }
}



const getListCategory  = async (req,res) => {
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/category')

    } catch (error) {
        
        res.redirect('/pageerror')
    }
}


const getUnlistCategory = async (req,res) => {
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:true}})
    } catch (error) {
        res.redirect('/pageerror')
        
    }
}



const getEditCategory = async (req,res) => {
    try {
        const id = req.params.id
        
        const category = await Category.findById(id)
      
        res.render('edit-category',{category})

    } catch (error) {
        res.redirect('/pageerror')
        
    }
}




const editCategory = async (req,res) => {

    try {

        const id = req.params.id
        console.log(req.body)

        
        const {categoryName,description} = req.body
        const existingCategory = await Category.findOne({name:categoryName})
        
    
        if(existingCategory){
            return res.status(400).json({error:"Category exists, please choose another name"})
        }

        const updateCategory = await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,
        },{new:true})


        if(updateCategory){
            return res.json({ message: "Category updated successfully", redirect: "/admin/category" });
        
        }else{
           return res.status(404).json({error:"Category not found"})
        }
    } catch (error) {
        console.error(error)
     return res.status(500).json({error:"Internal server error"})
        
    }
   
}     


const deleteCategory = async(req,res)=> {
    try {
        const {categoryId} = req.body

        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if(!deletedCategory){
            return res.status(404).json({error: 'category not found'})
        }

      

        res.json({ message: "Category deleted successfully" });


    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" })
        
    }
} 


 

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getUnlistCategory,
    getListCategory,
    getEditCategory,
    editCategory,
    deleteCategory,





    
}