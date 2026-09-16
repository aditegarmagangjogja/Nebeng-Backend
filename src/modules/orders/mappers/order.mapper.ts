import { TripMapper } from '../../trips/mappers/trip.mapper';

export class OrderMapper {
  static toResponse(order: any) {
    if (!order) return null;

    return {
      id: order.id.toString(),
      tripId: order.tripId ? order.tripId.toString() : null,
      customerId: order.customerId ? order.customerId.toString() : null,
      type: order.type,
      seatsBooked: Number(order.seatsBooked),
      totalItemsCount: Number(order.totalItemsCount),
      totalWeightKg: Number(order.totalWeightKg),
      totalPrice: Number(order.totalPrice),
      adminFeePercentage: order.adminFeePercentage
        ? Number(order.adminFeePercentage)
        : 10,
      qrCodeTicket: order.qrCodeTicket,
      otpClaim: order.otpClaim ?? null,
      readinessStatus: order.readinessStatus ?? null,
      status: order.status,
      escrowStatus: order.escrowStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      trip: order.trip ? TripMapper.toResponse(order.trip) : undefined,
      customer: order.customer
        ? {
            id: order.customer.id.toString(),
            name: order.customer.name,
            phone: order.customer.phone,
            email: order.customer.email,
          }
        : undefined,
      itemOrders: order.itemOrders
        ? order.itemOrders.map((item: any) => ({
            id: item.id.toString(),
            orderId: item.orderId.toString(),
            itemName: item.itemName,
            itemCategory: item.itemCategory,
            quantity: Number(item.quantity),
            weightPerItemKg: Number(item.weightPerItemKg),
            totalItemWeightKg: Number(item.totalItemWeightKg),
            sizeEnum: item.sizeEnum,
            photoUrl: item.photoUrl ?? null,
            securitySealQr: item.securitySealQr ?? null,
            recipientName: item.recipientName,
            recipientPhone: item.recipientPhone,
          }))
        : [],
    };
  }

  static toResponseList(orders: any[]) {
    return orders.map((o) => this.toResponse(o));
  }
}
