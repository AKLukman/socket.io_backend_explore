import { getCollection } from "../config/database.js"
import { calculateTotals, createOrderDocument, isValidStatusTransition, orderIdGenerator, orderValidation } from "../utils/helper.js"

export const orderHandler = ( io, socket ) => {


    // Emit -> Trigger -> on -> listen

    // place order
    socket.on( "placeOrder", async ( data, callback ) => {
        try {
            console.log( `Placed order from ${ socket.id }` )
            const validation = orderValidation( data )

            if ( !validation.valid ) {
                return callback( { success: false, message: validation.message } )
            }
            const totals = calculateTotals( data )
            const orderId = orderIdGenerator()
            const order = createOrderDocument( data, orderId, totals )
            const ordersCollection = getCollection( "orders" )
            await ordersCollection.insertOne( order )
            socket.join( `order-${ orderId }` )
            socket.join( 'customers' )
            io.to( 'admins' ).emit( 'newOrder', { order } )
            console.log( "Order Created", orderId )
        } catch ( error ) {
            console.log( error )
            callback( { success: false, message: 'Failed to place order.' } )
        }
    } )

    // track order
    socket.on( "trackOrder", async ( data, callback ) => {
        try {
            const ordersCollection = getCollection( 'orders' )
            const order = ordersCollection.findOne( { order: data.orderId } )
            if ( !order ) {
                callback( { success: false, message: "Order not found" } )
            }
            socket.join( `order-${ data.orderId }` )
            callback( { success: true, order } )
        } catch ( error ) {
            console.error( error )
            callback( { success: false, message: error.message } )
        }
    } )

    socket.on( 'cancelOrder', async ( data, callback ) => {
        try {
            const ordersCollection = getCollection( 'orders' )
            const order = ordersCollection.findOne( { order: data.orderId } )
            if ( !order ) {
                callback( { success: false, message: "Order not found" } )
            }

            if ( ![ 'pending', "confirmed" ].includes( data.status ) ) {
                return callback( { success: false, message: "Cannot be cancel this order!" } )
            }

            await ordersCollection.updateOne(
                { orderId: data.orderId },
                {
                    $set: { status: 'cancelled', updatedAt: new Date() },
                    $push: {
                        statusHistory: {
                            status: 'cancelled',
                            timestamp: new Date(),
                            by: socket.id,
                            note: data.reason || 'Cancelled by customer'
                        }
                    }
                }
            );

            io.to( `order_${ data.orderId }` ).emit( 'orderCancelled', { orderId: data.orderId } );
            io.to( 'admins' ).emit( 'orderCancelled', { orderId: data.orderId, customerName: order.customerName } );

            callback( { success: true } );
        } catch ( error ) {
            console.error( 'Get orders error:', error );
            callback( { success: false, message: 'Failed to load orders' } );
        }
    } )

    // Get My Orders
    socket.on( 'getMyOrders', async ( data, callback ) => {
        try {
            const ordersCollection = getCollection( 'orders' );
            const orders = await ordersCollection
                .find( { customerPhone: data.customerPhone } )
                .sort( { createdAt: -1 } )
                .limit( 50 )
                .toArray();

            callback( { success: true, orders } );

        } catch ( error ) {
            console.error( 'Get orders error:', error );
            callback( { success: false, message: 'Failed to load orders' } );
        }
    } );

    // admin
    // admin login
    socket.on( "adminLogin", async ( data, callback ) => {
        try {
            if ( data.password === process.env.ADMIN_PASSWORD ) {
                socket.join( 'admins' )
                console.log( "Admin logged in successfully", socket.id )
                callback( { success: true, message: 'Logged in successfully.' } )

            } else {
                callback( { success: false, message: "Email or Password doesn't match" } )
            }
        } catch ( error ) {
            callback( { success: false, message: 'Login Failed' } )
        }
    } )

    socket.on( "getAllOrders", async ( data, callback ) => {
        try {
            if ( !socket.isAdmin ) {
                return callback( { success: false, message: "You are not authorized." } )
            }
            const ordersCollection = getCollection( "orders" );
            const filter = data.status ? { status: data.status } : {}
            const orders = await ordersCollection.find( filter ).sort( { createdAt: -1 } ).limit( 20 ).toArray()
            callback( { success: true, orders } )
        } catch ( error ) {
            callback( { success: false, message: "Faild to load orders." } )
        }
    } )

    // Update Order Status
    socket.on( 'updateOrderStatus', async ( data, callback ) => {
        try {
            if ( !socket.isAdmin ) {
                return callback( { success: false, message: 'Unauthorized' } );
            }

            const ordersCollection = getCollection( 'orders' );
            const order = await ordersCollection.findOne( { orderId: data.orderId } );

            if ( !order ) {
                return callback( { success: false, message: 'Order not found' } );
            }

            if ( !isValidStatusTransition( order.status, data.newStatus ) ) {
                return callback( { success: false, message: 'Invalid status transition' } );
            }

            const result = await ordersCollection.findOneAndUpdate(
                { orderId: data.orderId },
                {
                    $set: { status: data.newStatus, updatedAt: new Date() },
                    $push: {
                        statusHistory: {
                            status: data.newStatus,
                            timestamp: new Date(),
                            by: socket.id,
                            note: 'Status updated by admin'
                        }
                    }
                },
                { returnDocument: 'after' }
            );

            io.to( `order_${ data.orderId }` ).emit( 'statusUpdated', { orderId: data.orderId, status: data.newStatus, order: result } );
            socket.to( 'admins' ).emit( 'orderStatusChanged', { orderId: data.orderId, newStatus: data.newStatus } );

            callback( { success: true, order: result } );

        } catch ( error ) {
            console.error( 'Update status error:', error );
            callback( { success: false, message: 'Failed to update status' } );
        }
    } );


}




