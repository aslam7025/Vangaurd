const Wallet = require('../../models/walletSchema')






const getWallet = async (req,res)=> {
    try {

        const userId = req.session.user

        if(!userId){
            return res.redirect('/login')

        }

        const wallet = await Wallet.findOne({userId})

        if(!wallet){

            const newwallet = new Wallet({
                userId,
                balance:0,
                transactions:[]
            })

            await newwallet.save()
            return res.render('profile',{wallet:newwallet})
        }

        

        
    } catch (error) {
        console.error("Error fetching wallet:", error);
        res.status(500).send("Internal Server Error");
    }
}









module.exports = {
    getWallet,

}