import { getCollection } from "../config/database.js"
import { calculateTotals, createOrderDocument, orderIdGenerator, orderValidation } from "../utils/helper.js"

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

}




