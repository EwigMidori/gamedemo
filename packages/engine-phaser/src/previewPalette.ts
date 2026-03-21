export const PreviewPalette = {
  terrainColor(terrainId: string): number {
    if (terrainId.includes("water")) return 0x4f7ddb;
    if (terrainId.includes("grass")) return 0x78a54b;
    if (terrainId.includes("sand")) return 0xc7a767;
    return 0x7b6a58;
  }
};
