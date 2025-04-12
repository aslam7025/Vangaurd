const Wallet = require('../../models/walletSchema')
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const mongoose = require('mongoose');

const getWallet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  
        const limit = 10; 
        const skip = (page - 1) * limit;

      
        const totalTransactions = await Wallet.aggregate([
            { $unwind: "$transactions" },
            { $count: "count" }
        ]);

      
        const transactions = await Wallet.aggregate([
            { $unwind: "$transactions" },
            { $lookup: { 
                from: "users",  
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }},
            { $unwind: "$user" }, 
            { $sort: { "transactions.createdAt": -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    "transactions": 1, 
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

 






module.exports = {
    getWallet,
    
}