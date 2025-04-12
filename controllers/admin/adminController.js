const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const bcrypt = require('bcrypt')




const pageerror = async (req,res) => {
    res.render('admin-error')
}

const loadLogin = (req,res) => {
    if(req.session.admin){
        return res.redirect('/admin/dashboard')
    }
    res.render('admin-login',{message:null})
}


const login = async (req,res) => {
    console.log('wor')

    try{
        const {email,password} = req.body
        const admin = await User.findOne({email,isAdmin:true})
         

        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin = true
                return res.redirect('/admin/dashboard')
            }else{
                return res.redirect('/admin/login')
            }
        }else{
            return res.redirect('/admin/login')
        }


    }catch(error){

        console.error('login error ',error)
        res.redirect('/pageerror')

    }
}



const loadDashboard = async (req,res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    } 

     
    try {
         
        const totalSalesData = await Order.aggregate([
            { $match: { status: { $nin: ["Cancelled", "Returned"] } } }, 
            { $group: { _id: null, total: { $sum: "$finalAmount" } } }
        ]);
        const totalSales = totalSalesData.length > 0 ? totalSalesData[0].total : 0;
        
        const bestSellingProducts = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { $group: {
                _id: "$orderedItems.product",
                totalSold: { $sum: "$orderedItems.quantity" }
            }},
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            { $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"  
            }},
            { $unwind: "$productDetails" }
        ]);
        
        
        const bestSellingCategories = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { 
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",   
                    foreignField: "_id",
                    as: "productData"
                }
            },
            { $unwind: "$productData" }, 
            {
                $lookup: {
                    from: "categories",  
                    localField: "productData.category",
                    foreignField: "_id",
                    as: "categoryData"
                }
            },
            { $unwind: "$categoryData" },  
            { 
                $group: {
                    _id: "$categoryData._id",  
                    categoryName: { $first: "$categoryData.name" },  
                    totalSold: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        // console.log('category:',bestSellingCategories)

       
        const bestSellingBrands = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { $lookup: {
                from: "products",
                localField: "orderedItems.product",
                foreignField: "_id",
                as: "productData"
            }},
            { $unwind: "$productData" },
            { $group: {
                _id: "$productData.brand",
                totalSold: { $sum: "$orderedItems.quantity" }
            }},
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentWeek = new Date().getDate() - 7;

        
        const yearlySales = await Order.aggregate([
            { $match: { createdOn: { $gte: new Date(`${currentYear}-01-01`) } } },
            { $group: { 
                _id: { $month: "$createdOn" }, 
                total: { $sum: "$finalAmount" } 
            }},
            { $sort: { "_id": 1 } }
        ]);

       // console.log('year',yearlySales)

        
        const monthlySales = await Order.aggregate([
            { $match: { createdOn: { $gte: new Date(currentYear, currentMonth, 1) } } },
            { $group: { _id: { $dayOfMonth: "$createdOn" }, total: { $sum: "$finalAmount" } } },
            { $sort: { _id: 1 } }
        ]);

      //  console.log('month',monthlySales)

        // Weekly Sales Data
        const weeklySales = await Order.aggregate([
            { $match: { createdOn: { $gte: new Date(currentYear, currentMonth, currentWeek) } } },
            { $group: { _id: { $dayOfWeek: "$createdOn" }, total: { $sum: "$finalAmount" } } },
            { $sort: { _id: 1 } }
        ]);

     //   console.log('week',weeklySales)

        res.render('admin-dashboard', {
            totalSales,
            bestSellingProducts,
            bestSellingCategories,
            bestSellingBrands,
            yearlySales,
            monthlySales,
            weeklySales
        });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).send("Internal Server Error");
    }

   
    
}



const logout = async (req,res)=>{
    try {
        req.session.destroy((err) => {
            if(err){
                console.log('Error destroyin session')
                return res.redirect('/pageerror')
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log('Unexpected error')
        res.redirect('/pageerror')
        
    }
}






module.exports ={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}