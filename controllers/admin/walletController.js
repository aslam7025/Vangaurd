const Wallet = require('../../models/walletSchema')
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const mongoose = require('mongoose');

const getWallet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get page number from query, default to 1
        const limit = 10; // Transactions per page
        const skip = (page - 1) * limit;

        // Get total transaction count
        const totalTransactions = await Wallet.aggregate([
            { $unwind: "$transactions" },
            { $count: "count" }
        ]);

        // Fetch transactions with user details
        const transactions = await Wallet.aggregate([
            { $unwind: "$transactions" },
            { $lookup: { 
                from: "users", // MongoDB collection name for User (ensure it's lowercase in MongoDB)
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }},
            { $unwind: "$user" }, // Extract user details
            { $sort: { "transactions.createdAt": -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    "transactions": 1, // Keep transactions
                    "user._id": 1,  
                    "user.firstName": 1,
                    "user.lastName": 1,
                    "user.email": 1,
                    "user.phone": 1
                }
            }
        ]);

        console.log('from admin wallet', transactions);

        const totalPages = Math.ceil((totalTransactions[0]?.count || 0) / limit);

        res.render("admin-wallet", {
            transactions,
            currentPage: page,
            totalPages,
            totalCredits: await Wallet.aggregate([
                { $unwind: "$transactions" },
                { $match: { "transactions.type": "credit" } },
                { $group: { _id: null, total: { $sum: "$transactions.amount" } } }
            ]).then(result => result[0]?.total || 0),
            totalDebits: await Wallet.aggregate([
                { $unwind: "$transactions" },
                { $match: { "transactions.type": "debit" } },
                { $group: { _id: null, total: { $sum: "$transactions.amount" } } }
            ]).then(result => result[0]?.total || 0)
        });

    } catch (error) {
        console.error("Error fetching wallet transactions:", error);
        res.status(500).send("Server Error");
    }
};



const getWalletDetails = async (req,res)=> {
    try {

        const {transactionId} = req.query
        console.log(transactionId)
        const transaction =await Wallet.aggregate(
            [
                {
                    $lookup: {
                        from: "users", // Collection name in MongoDB
                        localField: "userId",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {$unwind:"$transactions"},
                {$match:{'transactions._id':new mongoose.Types.ObjectId(transactionId)}},
            ]
        )

        if(transaction.length===0){
            //redirect
        }
        console.log(transaction)
        res.render('admin-wallet-details',{transaction:transaction[0]})
        
    } catch (error) {
        console.error("Error fetching wallet details:", error);
        res.status(500).send("Internal Server Error");
    }
}







module.exports = {
    getWallet,
    getWalletDetails,
}