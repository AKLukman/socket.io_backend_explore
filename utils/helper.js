export const orderValidation = ( data ) => {
    if ( !data.customerName?.trim() ) {
        return {
            valid: false,
            message: "Customer name is required"
        }
    }
    if ( !data.customerPhone?.trim() ) {
        return {
            valid: false,
            message: "Customer phone number is required"
        }
    }
    if ( !data.customerAddress?.trim() ) {
        return {
            valid: false,
            message: "Customer Address is required"
        }
    }
    if ( !Array.isArray( data.items ) ) {
        return {
            valid: false,
            message: "Order must have at least one item"
        }
    }

    return { valid: true }
}

export const orderIDGenerator = () => {
    const now = new Date();
    const year = now.getFullYear()
    const month = String( now.getMonth() + 1 ).padStart( 2, '0' )
    const day = String( now.getDate() ).padStart( 2, '0' )
    const orderId = ``
}