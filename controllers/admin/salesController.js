const Order = require("../../models/orderSchema")
const PDFDocument = require("pdfkit");
const fs = require("fs");
const ExcelJS = require("exceljs");









const getSalesReport = async (req,res)=> {
    try {

        console.log('sales:',req.query)

        const { page = 1, day, date } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;
        let query = { status: { $in: ["Confirmed", "Delivered"] } }; // <-- Filter orders by status

        let filterFlags = {
            salesToday: false,
            salesWeekly: false,
            salesMonthly: false,
            salesYearly: false
        };

        const setDateFilter = (daysBack = 0) => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysBack);
            startDate.setHours(0, 0, 0, 0);
            return { $gte: startDate };
        };

        switch (day) {
            case 'salesToday':
                query.createdOn = setDateFilter(0);
                filterFlags.salesToday = true;
                break;
            case 'salesWeekly':
                query.createdOn = setDateFilter(7);
                filterFlags.salesWeekly = true;
                break;
            case 'salesMonthly':
                query.createdOn = setDateFilter(30);
                filterFlags.salesMonthly = true;
                break;
            case 'salesYearly':
                query.createdOn = setDateFilter(365);
                filterFlags.salesYearly = true;
                break;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdOn = { $gte: startOfDay, $lte: endOfDay };
        }

        const orders = await Order.find(query)
            .populate({
                path: 'orderedItems.product',
                model: 'Product',
                select: 'name price'
            })
            .populate('userId', 'firstName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdOn: -1 })
            .lean();

        const allOrders = await Order.find(query).lean();
       console.log(allOrders)
        const salesMetrics = allOrders.reduce((acc, order) => ({
            totalOrders: acc.totalOrders + 1,
            totalSales: acc.totalSales + (order.totalPrice || 0),
            totalDiscounts: acc.totalDiscounts + (order.discount || 0),
            grandTotal: acc.grandTotal + (order.finalAmount || 0)
        }), {
            totalOrders: 0,
            totalSales: 0,
            totalDiscounts: 0,
            grandTotal: 0
        });

        const totalPages = Math.ceil(salesMetrics.totalOrders / limit);

        res.render('sales-report', {
            data: orders,
            currentPage: parseInt(page),
            totalPages,
            date,
            day,
            ...filterFlags,
            ...salesMetrics
        });
    
    } catch (error) {
        console.error(error)
        res.status(500).json({message:'Internal server error'})
    }
}




const downloadPDF = async (req, res) => {
    try {

        let { day, startDate, endDate } = req.query;
        let query = {};

        const today = new Date();
        let fromDate = null;
        let toDate = today;

        if (day === "salesToday") {
            fromDate = new Date();
        } else if (day === "salesWeekly") {
            fromDate = new Date();
            fromDate.setDate(today.getDate() - 7);
        } else if (day === "salesMonthly") {
            fromDate = new Date();
            fromDate.setMonth(today.getMonth() - 1);
        } else if (day === "salesYearly") {
            fromDate = new Date();
            fromDate.setFullYear(today.getFullYear() - 1);
        }

        if ((!startDate || !endDate || startDate.trim() === '' || endDate.trim() === '') && fromDate) {
            startDate = fromDate.toISOString().split("T")[0];
            endDate = toDate.toISOString().split("T")[0];

        }

        if (!startDate || !endDate || startDate.trim() === '' || endDate.trim() === '') {
            return res.status(400).json({ message: "Start date and end date are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        query.createdOn = { $gte: start, $lte: end };
        query.status = { $in: ["Confirmed", "Delivered"] }; // Ensure only confirmed & delivered orders


        const orders = await Order.find(query)
        .populate('userId', 'firstName email') // Populate user details
        .populate({
            path: 'orderedItems.product', // Populate product details
            model: 'Product',
            select: 'productName' // Only fetch productName to reduce data load
        })
        .sort({ createdOn: -1 })
        .lean();
    

        if (orders.length === 0) {
            return res.status(404).json({ message: "No orders found for the selected date range." });
        }
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=salesReport.pdf');
        doc.pipe(res);

        // Table configuration
        const columnConfig = [
            { header: 'Order ID', width: 90, align: 'left' },
            { header: 'User', width: 130, align: 'left' },
            { header: 'Total (₹)', width: 70, align: 'right' },
            { header: 'Discount (₹)', width: 80, align: 'right' },
            { header: 'Date', width: 90, align: 'center' },
            { header: 'Items', width: 150, align: 'left' }
        ];

        const rowHeight = 30;
        const headerColor = '#f0f0f0';
        let currentY = doc.y;
        let pageNumber = 1;

        // Function to draw headers
        const drawHeader = () => {
            doc.font('Helvetica-Bold').fontSize(12);
            let x = 50;
            columnConfig.forEach((col) => {
                doc.rect(x, currentY, col.width, rowHeight)
                   .fillAndStroke(headerColor, '#000');
                doc.fillColor('#000')
                   .text(col.header, x + 5, currentY + 10, {
                       width: col.width - 10,
                       align: col.align
                   });
                x += col.width;
            });
            currentY += rowHeight;
            doc.moveTo(50, currentY).lineTo(x, currentY).stroke();
        };

        // Function to add new page
        const addNewPage = () => {
            doc.addPage();
            pageNumber++;
            currentY = 50; // Reset to top margin
            drawHeader();
            
            // Add footer with page number
            doc.fontSize(10).text(
                `Page ${pageNumber}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );
        };

        // Initial header
        doc.fontSize(18).text('Sales Report', { align: 'center' });
        doc.moveDown(1.5);
        currentY = doc.y;
        drawHeader();

        // Draw data rows
        doc.font('Helvetica').fontSize(10);
        orders.forEach((order, rowIndex) => {
            // Check page boundaries
            if (currentY > doc.page.height - 100) {
                addNewPage();
            }

            const items = order.orderedItems
            .map(item => `${item.product?.productName || 'Unknown'} x${item.quantity}`)

                .join('\n');

                const rowData = [
                    order.orderId || "Unknown",
                    `${order.userId?.firstName || "Unknown"}\n${order.userId?.email || "Unknown"}`,
                    (order.finalAmount ? order.finalAmount.toFixed(2) : "Unknown"),
                    (order.discount !== undefined ? order.discount.toFixed(2) : "Unknown"),
                    (order.createdOn ? order.createdOn.toISOString().split('T')[0] : "Unknown"),
                    items || "Unknown"
                ];
                

            // Calculate max height for the row
            let maxCellHeight = rowHeight;
            columnConfig.forEach((col, colIndex) => {
                const textHeight = doc.heightOfString(rowData[colIndex], {
                    width: col.width - 10
                });
                maxCellHeight = Math.max(maxCellHeight, textHeight + 20);
            });

            // Check if we need a new page before drawing row
            if (currentY + maxCellHeight > doc.page.height - 50) {
                addNewPage();
            }

            // Draw cells
            let x = 50;
            columnConfig.forEach((col, colIndex) => {
                doc.rect(x, currentY, col.width, maxCellHeight).stroke();
                doc.fillColor('#333')
                   .text(rowData[colIndex], x + 5, currentY + 10, {
                       width: col.width - 10,
                       align: col.align
                   });
                x += col.width;
            });

            currentY += maxCellHeight;
            doc.moveTo(50, currentY).lineTo(x, currentY).stroke();
        });

        // Add final footer
        doc.fontSize(10).text(
            `Page ${pageNumber}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );

        doc.end();
    } catch (error) {
        res.status(500).json({ message: "Error generating PDF" });
    }
};





const downloadExcel = async (req, res) => {
    try {

        let { day, startDate, endDate } = req.query;
        let query = {};

        const today = new Date();
        let fromDate = null;
        let toDate = today;

        if (day === "salesToday") {
            fromDate = new Date();
        } else if (day === "salesWeekly") {
            fromDate = new Date();
            fromDate.setDate(today.getDate() - 7);
        } else if (day === "salesMonthly") {
            fromDate = new Date();
            fromDate.setMonth(today.getMonth() - 1);
        } else if (day === "salesYearly") {
            fromDate = new Date();
            fromDate.setFullYear(today.getFullYear() - 1);
            fromDate.setUTCHours(0, 0, 0, 0); // Start of the day 1 year ago
            
            // For yearly reports, explicitly set the day to match today's date
            // This ensures we get a full 365/366 days
            fromDate.setDate(today.getDate());
            fromDate.setMonth(today.getMonth());
        }

        if ((!startDate || !endDate || startDate.trim() === '' || endDate.trim() === '') && fromDate) {
            startDate = fromDate.toISOString().split("T")[0];
            endDate = toDate.toISOString().split("T")[0];

        }

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        query.createdOn = { $gte: start, $lte: end };
        query.status = { $in: ["Confirmed", "Delivered"] }; // Ensure only confirmed & delivered orders


        const orders = await Order.find(query)
        .populate('userId', 'firstName email') // Populate user details
        .populate({
            path: 'orderedItems.product', // Populate product details
            model: 'Product',
            select: 'productName' // Ensure this matches your schema field
        })
        .sort({ createdOn: -1 })
        .lean();
    



        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "No orders found for the selected date range." });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        worksheet.columns = [
            { header: "Order ID", key: "orderId", width: 20 },
            { header: "User Name", key: "userName", width: 20 },
            { header: "User Email", key: "userEmail", width: 25 },
            { header: "Total Amount", key: "finalAmount", width: 15 },
            { header: "Discount", key: "discount", width: 15 },
            { header: "Order Date", key: "createdOn", width: 20 },
            { header: "Product Name", key: "productName", width: 25 },
            { header: "Quantity", key: "quantity", width: 10 }
        ];

        orders.forEach(order => {
            if (!Array.isArray(order.orderedItems) || order.orderedItems.length === 0) {
                worksheet.addRow({
                    orderId: order.orderId,
                    userName: order.userId?.firstName || "Unknown User",
                    userEmail: order.userId?.email || "N/A",
                    finalAmount: order.finalAmount,
                    discount: order.discount || 0,
                    createdOn: order.createdOn.toDateString(),
                    productName: "No Products", // ✅ FIXED
                    quantity: 0
                });
            } else {
                order.orderedItems.forEach(item => {
                    worksheet.addRow({
                        orderId: order.orderId,
                        userName: order.userId?.firstName || "Unknown User",
                        userEmail: order.userId?.email || "N/A",
                        finalAmount: order.finalAmount ,
                        discount: order.discount || 0,
                        createdOn: order.createdOn.toDateString(),
                        productName: item.product?.productName || "Unknown Product", // ✅ FIXED
                        quantity: item.quantity
                    });
                });
            }
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=salesReport.xlsx");
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: "Error generating Excel report" });
    }
};





module.exports = {
    getSalesReport,
    downloadExcel,
    downloadPDF
}