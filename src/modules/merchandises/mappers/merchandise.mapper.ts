export class MerchandiseMapper {
  static toItemResponse(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id.toString(),
      name: entity.name,
      description: entity.description,
      pointsRequired: Number(entity.pointsRequired),
      stock: Number(entity.stock),
      imageUrl: entity.imageUrl,
      isActive: Boolean(entity.isActive),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toRedemptionResponse(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id.toString(),
      userId: entity.userId?.toString(),
      userName: entity.user?.name,
      merchandiseId: entity.merchandiseId?.toString(),
      merchandiseName: entity.merchandise?.name,
      merchandiseImage: entity.merchandise?.imageUrl,
      pointsSpent: Number(entity.pointsSpent),
      recipientName: entity.recipientName,
      recipientPhone: entity.recipientPhone,
      shippingAddress: entity.shippingAddress,
      pickupPosId: entity.pickupPosId ? entity.pickupPosId.toString() : null,
      pickupPosName: entity.pickupPos?.name || null,
      status: entity.status,
      trackingNumber: entity.trackingNumber,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
