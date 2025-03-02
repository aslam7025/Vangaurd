const User = require('../../models/userScheema')
const mongoose = require('mongoose')
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
    try{
        const {email,password} = req.body
        console.log(email,password)

        const admin = await User.findOne({email,isAdmin:true})
        console.log(admin)

        if(admin){

            const passwordMatch =  bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin = true
                console.log(req.session.admin)
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

    
        if(req.session.admin)
            try{
            res.render('admin-dashboard')

        
    } catch (error) {
        res.redirect('/pageerror')
        
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