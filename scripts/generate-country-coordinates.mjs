import countries from "world-countries";
import { writeFile } from "node:fs/promises";

const entries=countries.map(({cca2,latlng})=>`  ${JSON.stringify(cca2)}:[${latlng[0]},${latlng[1]}]`).join(",\n");
const output=`// Generated from world-countries. Values are [latitude, longitude].\nexport const countryCoordinates: Record<string,[number,number]> = {\n${entries}\n};\n`;

await writeFile(new URL("../src/scripts/country-coordinates.ts",import.meta.url),output);
