const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const brandController = require('../controllers/admin/brandController')
const productController = require('../controllers/admin/productController')
const orderController  = require('../controllers/admin/orderController')
const couponController = require('../controllers/admin/couponController')
const salesController = require('../controllers/admin/salesController')
const {userAuth,adminAuth,isSessionAdmin} = require('../middlewares/auth')
const {pageerror} = require('../controllers/admin/brandController')
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})



 

router.get('/pageerror',adminController.pageerror)
 


router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)

router.get('/logout',adminAuth,adminController.logout)




router.get('/dashboard',adminAuth,adminController.loadDashboard)
router.get('/users',isSessionAdmin,adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked )
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)
 


//category

 router.get('/category',isSessionAdmin,adminAuth,categoryController.categoryInfo)
 router.post('/addCategory',isSessionAdmin,adminAuth,categoryController.addCategory)
 router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
 router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
 router.get('/listCategory',adminAuth,categoryController.getListCategory)
 router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)
 router.get('/editCategory/:id',isSessionAdmin,adminAuth,categoryController.getEditCategory)
 router.post('/editCategory/:id',isSessionAdmin,adminAuth,categoryController.editCategory)
 router.delete('/deleteCategory',isSessionAdmin,adminAuth,categoryController.deleteCategory)




 //Brand
 router.get('/brands',isSessionAdmin,adminAuth,brandController.getBrandPage)
 router.post('/addBrand',adminAuth,uploads.single('image'),brandController.addBrand)
 router.get('/blockBrand',adminAuth,brandController.blockBrand)
 router.get('/unblockBrand',adminAuth,brandController.unblockBrand)
 router.get('/deleteBrand',adminAuth,brandController.deleteBrand)

//product
 router.get('/addProducts',isSessionAdmin,adminAuth,productController.getProductAddPage)
 router.post('/addProducts',isSessionAdmin,adminAuth,uploads.array("images",4),productController.addProducts)
 router.get('/products',isSessionAdmin,adminAuth,productController.getAllProducts)
 router.post('/addProductOffer',isSessionAdmin,adminAuth,productController.addProductOffer)
 router.post('/removeProductOffer',adminAuth,productController.removeProductOffer)
 router.get('/blockProduct',adminAuth,productController.blockProduct)
 router.get('/unblockProduct',adminAuth,productController.unblockProduct)
 router.get('/editProduct',isSessionAdmin,adminAuth,productController.getEditProduct)
 router.post('/editProduct/:id',isSessionAdmin,adminAuth,uploads.array("images",4),productController.editProduct)
 router.post('/deleteImage',adminAuth,productController.deleteSingleImage)


 //order management
 router.get('/orders',isSessionAdmin,adminAuth,orderController.getorder)
 router.get('/api/orders', isSessionAdmin,adminAuth, orderController.getOrderList);
 router.get('/order-details/:orderId',isSessionAdmin, adminAuth,orderController.getorderDetails)
 router.post('/update-order-status',isSessionAdmin,adminAuth,orderController.updateStatus)

 

 //coupon management
 router.get('/coupon',isSessionAdmin,adminAuth,couponController.getCoupon)
 router.post('/createCoupon',isSessionAdmin,adminAuth,couponController.createCoupon)
 router.get('/edit-coupon',isSessionAdmin,adminAuth,couponController.editCoupon)
 router.post('/updateCoupon',isSessionAdmin,adminAuth,couponController.updateCoupon)
 router.get('/deleteCoupon',isSessionAdmin,adminAuth,couponController.deleteCoupon)


 
  //sales report
  router.get('/sales-report',isSessionAdmin,adminAuth,salesController.getSalesReport)


  router.get("/download-pdf",isSessionAdmin,adminAuth,salesController.downloadPDF);
  router.get("/download-excel",isSessionAdmin,adminAuth,salesController.downloadExcel);

module.exports = router