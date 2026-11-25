import type { SKRSContext2D } from '@napi-rs/canvas';
import { PLATE_PALETTE, plateWedges } from './plate';

export type PlateGeometry = {
  centerX: number;
  centerY: number;
  plateRadius: number;
  wedgeRadius: number;
  holeRadius: number;
};

const fillDisc = (
  ctx: SKRSContext2D,
  { centerX, centerY }: PlateGeometry,
  radius: number,
): void => {
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = PLATE_PALETTE.plate;
  ctx.fill();
};

// The white plate, its three macro wedges, and the white hole at the middle.
export const drawPlate = (ctx: SKRSContext2D, geometry: PlateGeometry): void => {
  const { centerX, centerY, plateRadius, wedgeRadius, holeRadius } = geometry;
  fillDisc(ctx, geometry, plateRadius);
  for (const wedge of plateWedges()) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, wedgeRadius, wedge.start, wedge.end);
    ctx.closePath();
    ctx.fillStyle = wedge.colour;
    ctx.fill();
  }
  fillDisc(ctx, geometry, holeRadius);
};
