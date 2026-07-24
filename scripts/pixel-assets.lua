-- Run with: aseprite --batch --script scripts/pixel-assets.lua
-- Generates both the editable .aseprite source and the exported web sprite.
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "public/assets/nezha-console.aseprite"
local img = spr.cels[1].image
local bg = Color{ r=23, g=26, b=31, a=255 }
local yellow = Color{ r=244, g=211, b=94, a=255 }
local red = Color{ r=238, g=108, b=77, a=255 }
img:clear(bg)
for y=4,27 do for x=4,27 do img:drawPixel(x,y,yellow) end end
for y=10,13 do for x=9,12 do img:drawPixel(x,y,bg) end end
for y=10,13 do for x=19,22 do img:drawPixel(x,y,bg) end end
for y=20,22 do for x=9,22 do img:drawPixel(x,y,bg) end end
for y=20,22 do for x=14,17 do img:drawPixel(x,y,red) end end
spr:saveAs("public/assets/nezha-console.aseprite")
spr:saveCopyAs("public/assets/nezha-console.png")
