import { orderValidation } from "../utils/helper.js"

export const orderHandler = ( io, socket ) => {
    console.log( socket.id )

    // emmit -> trigger -> on -> listen

    // place order
    socket.on( "placeOrder", async ( data, callback ) => {
        try {
            console.log( `Placed order from ${ socket.id }` )
            const validation = orderValidation( data )

            if ( !validation.valid ) {
                return callback( { success: false, message: validation.message } )
            }
        } catch ( error ) {
            console.log( error )
        }
    } )
}