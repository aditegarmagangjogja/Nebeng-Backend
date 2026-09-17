export class RegionMapper {
  static toRegionResponse(region: any) {
    if (!region) return null;

    let parsedPolygon = null;
    if (region.boundaryPolygon) {
      try {
        parsedPolygon =
          typeof region.boundaryPolygon === 'string'
            ? JSON.parse(region.boundaryPolygon)
            : region.boundaryPolygon;
      } catch {
        parsedPolygon = null;
      }
    }

    return {
      id: region.id.toString(),
      name: region.name,
      code: region.code,
      isActive: region.isActive,
      pricePerKm: region.pricePerKm ? Number(region.pricePerKm) : 3000,
      latitude: region.latitude ? Number(region.latitude) : null,
      longitude: region.longitude ? Number(region.longitude) : null,
      radiusKm: region.radiusKm ? Number(region.radiusKm) : null,
      boundaryPolygon: parsedPolygon,
      createdAt: region.createdAt,
      updatedAt: region.updatedAt,
    };
  }

  static toCityResponse(city: any) {
    if (!city) return null;

    return {
      id: city.id.toString(),
      name: city.name,
      province: city.province,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
    };
  }
}
