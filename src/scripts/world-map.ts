import { geoEquirectangular, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { countryCoordinates } from "./country-coordinates";

export interface MapPoint { x: number; y: number }

const points = new Map<string,MapPoint>(Object.entries(countryCoordinates).map(([code,[lat,lon]])=>[
  code,{x:(lon+180)/360*100,y:(90-lat)/180*100}
]));
// Common non-standard aliases occasionally returned by geo-IP providers.
points.set("UK",points.get("GB")!);

export function countryPoint(code: string): MapPoint | undefined {
  return points.get(code.trim().toUpperCase());
}

const topology = world as any;
const projection = geoEquirectangular().translate([500,250]).scale(500/Math.PI).precision(.1);
const path = geoPath(projection);
const landPath = path(feature(topology,topology.objects.land) as any) || "";
const borderPath = path(mesh(topology,topology.objects.countries,(a,b)=>a!==b) as any) || "";

// Natural Earth 1:110m geometry from world-atlas: real coastlines and borders,
// projected to the same 1000 × 500 equirectangular canvas used by node markers.
export const worldLand = `<path d="${landPath}"/>`;
export const worldBorders = `<path d="${borderPath}"/>`;
