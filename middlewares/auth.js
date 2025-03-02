const User = require('../models/userScheema')


const userAuth = (req,res,next) => {
    if(req.session.user){
        User.findById(req.session.user)
        .then((data) => {
            if(data && !data.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }
        })
        .catch((err) => {
            console.log('Error in user auth middleware',err)
            res.status(500).send('Internal Server error')
        })
    }else{
        res.redirect('/login')
    }
}


const adminAuth = (req,res,next) => {
    User.findOne({isAdmin:true})
    .then((data) => {
        if(data){
            next()
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch((err) => {
        console.log('Error in adminauth middleware',err)
        res.status(500).send('Internal Server Error')
})

}




module.exports = {
    userAuth,
    adminAuth
}