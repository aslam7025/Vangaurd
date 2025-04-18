const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')





const getOrderList = async (req, res) => {
    try {
        console.log(req.query)
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        console.log(searchQuery)
        
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
      

        let query = {};

        if (searchQuery) {
            query = {
                $or: [
                    { orderId: { $regex: searchQuery, $options: "i" } }, 
                    { "userId.firstName": { $regex: searchQuery, $options: "i" } },
                    { "userId.lastName": { $regex: searchQuery, $options: "i" } }
                ]
            };
        }

        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('userId', 'firstName email')  
            .sort({ createdOn: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        
        const formattedOrders = orders.map(order => ({
            ...order.toObject(),
            user: order.userId, // Rename userId to user
        }));

        res.json({
            orders: formattedOrders,
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: page,
            searchQuery:searchQuery
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Failed to fetch orders." });
    }
};


const getorder=async(req,res)=>
{
    try {
        const search = req?.query?.search?.trim();
        const filter={};
        if(search){
            filter.orderId=search;   
        }

        const orders = await Order.find(filter);
        res.render("admin-orders",{orders})
        
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
        
    }
}




const getorderDetails = async (req,res) => {
    try {

        const { orderId } = req.params;

       
        const order = await Order.findById(orderId)
            .populate('userId', 'firstName lastName email') 
            .populate({  
                path:'orderedItems.product',select:'productName productImage price'
            }); 

           

        if (!order) {
            return res.status(404).render('admin/error', { message: 'Order not found' });
        }
        console.log('order data:',order)
        console.log('order Items:',order.orderedItems)

        res.render('admin-order-details', { order });
        
    } catch (error) {
        console.error('Error fetching order details:', error)
        res.status(500).render('admin/error', { message: 'Server error' })
        
    }
}



const updateStatus = async (req,res) => {
    try {
        const { orderId, status } = req.body;

      
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update the order status
        order.status = status;
        await order.save();


        if (status === 'Returned') {
            const refundAmount = order.finalAmount ?? order.totalPrice ?? 0;

            let wallet = await Wallet.findOne({ userId: order.userId._id });

            if (!wallet) {
                wallet = new Wallet({
                    userId: order.userId._id,
                    balance: refundAmount,
                    transactions: [{
                        type: 'credit',
                        amount: refundAmount,
                        description: `Refund for returned order ${order.orderId || order._id}`,
                        orderId: order._id
                    }]
                });
            } else {
                wallet.balance += refundAmount;
                wallet.transactions.push({
                    type: 'credit',
                    amount: refundAmount,
                    description: `Refund for returned order ${order.orderId || order._id}`,
                    orderId: order._id
                });
            }

            await wallet.save();
        }


        res.json({ success: true, message: 'Order status updated successfully', updatedStatus: status });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}





module.exports ={
    getOrderList,
    getorder,
    getorderDetails,
    updateStatus,
   

    
}