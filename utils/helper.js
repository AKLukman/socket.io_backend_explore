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

export const orderIdGenerator = () => {
    const now = new Date();
    const year = now.getFullYear()
    const month = String( now.getMonth() + 1 ).padStart( 2, '0' )
    const day = String( now.getDate() ).padStart( 2, '0' )
    const random = Math.floor( Math.random() * 1000 ).toString().padStart( 3, "0" )
    const orderId = `ORD-${ year }${ month }${ day }${ random }`
    return orderId
}

export const calculateTotals = ( items ) => {
    const subTotal = items.reduce( ( sum, item ) => sum + ( item?.price * item.quantity ), 0 )
    const tax = subTotal * 0.10
    const deliveryFee = 40.00
    const total = subTotal + tax + deliveryFee

    return {
        subTotal: Math.ceil( subTotal ),
        tax: Math.ceil( tax ),
        deliveryFee,
        total: Math.ceil( total )

    }
}

export function createOrderDocument( orderData, orderId, totals ) {
    return {
        orderId,
        customerName: orderData.customerName.trim(),
        customerPhone: orderData.customerPhone.trim(),
        customerAddress: orderData.customerAddress.trim(),
        items: orderData.items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        deliveryFee: totals.deliveryFee,
        totalAmount: totals.totalAmount,
        specialNotes: orderData.specialNotes || '',
        paymentMethod: orderData.paymentMethod || 'cash',
        paymentStatus: 'pending',
        status: 'pending',
        statusHistory: [ {
            status: 'pending',
            timestamp: new Date(),
            by: 'customer',
            note: 'Order placed'
        } ],
        estimatedTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

//  Check if status transition is valid

export function isValidStatusTransition( currentStatus, newStatus ) {
    const validTransitions = {
        'pending': [ 'confirmed', 'cancelled' ],
        'confirmed': [ 'preparing', 'cancelled' ],
        'preparing': [ 'ready', 'cancelled' ],
        'ready': [ 'out_for_delivery', 'cancelled' ],
        'out_for_delivery': [ 'delivered' ],
        'delivered': [],
        'cancelled': []
    };

    return validTransitions[ currentStatus ]?.includes( newStatus ) || false;
}