const env = require('dotenv').config()

const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20')
const User = require('../models/userSchema')



passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://vangaurd.today/auth/google/callback'
,
    
},

async (accessToken,refreshToken,profile,done) =>  {
    try {
        let user = await User.findOne({googleId:profile.id})
        if(user){
            return done(null,user)
        }else{
            user = new User({
                firstName:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
            })
            await user.save()
            return done(null,user)
        }
        
    } catch (error) {
        return done(error,null)
        
    }
    
}


))

passport.serializeUser((user,done) => {
    done(null,user.id)
})

passport.deserializeUser((id,done) => {
    User.findById(id)
    .then((user) => {
        done(null,user)
    })
    .catch((err) => {
        done(err,null)
    })
})


module.exports = passport