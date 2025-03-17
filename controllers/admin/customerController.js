const User = require('../../models/userSchema')

const customerInfo = async (req,res) => {
    try {
        let search = ""
        if(req.query.search){
            search = req.query.search || ""
        }
        
        let page = 1 
        if(req.query.page){
            page = parseInt(req.query.page,10)||1
        }

        const limit = 5


        const data = await User.find({
            isAdmin:false,
            $or:[
                {firstName:{$regex:".*"+search+".*",$options:"i"}},
                {email:{$regex:".*"+search+".*",$options:"i"}},
            ],
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec()
       

        const count = await User.countDocuments({
            isAdmin:false,
            $or:[
                {firstName:{$regex:".*" + search + ".*",$options:"i"}},
                {email:{$regex:".*" + search + ".*",$options:"i"}},
            ],
        })

        const totalPages = Math.ceil(count / limit)
      
        res.render("customers",{data,count,search,page,totalPages,currentPage:page})
        
    } catch (error) {
        console.error("Error fetching customer info:", error);
        res.redirect("/pageerror");
    }
}

const customerBlocked = async (req,res)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')

        
    }

}

const customerunBlocked = async (req,res) => {
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
        
    } catch (error) {
        res.redirect('/pageerror')
        
    }
}

 



module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
  

}