# 美术资源

小丑牌与卡包位图使用内置 Image Gen 生成，保存在项目资源目录。名称与说明由界面渲染，图集不嵌入价格或稀有度，因此中英文共用同一资源。

- `public/art/dave-jokers-expanded.png`：7 列 × 4 行，共 28 张独立小丑牌。
- `public/art/buffoon-packs.png`：3 列 × 1 行，普通、巨型、超级小丑卡包封面。

现有五张卡面作为风格参考。新图集参考各张牌的标志性主体进行适配，卡包封面以单脸、双侧脸、三面具区分规格。素材不是戴夫原版逐像素卡面。

## 小丑图集提示词

Create ONE production pixel-art sprite atlas for a Balatro / Dave the Diver Jimbo fan game. Match the attached reference's crisp colored pixel-art, cream playing-card stock, thin dark double borders. EXACTLY 7 columns x 4 rows = 28 equally sized rectangular portrait cards. Canvas ratio 1.05:1, each cell portrait 3:5. Card edges touch the cell boundaries, no outer margin, no gutters, no shadows outside cells. Every card has its own distinct subject, NOT repeated clown faces. No labels or names except optional small vertical JOKER side text. Ordered left to right, top to bottom:

Row1: Ancient Joker (weathered stone tribal mask), Blueprint (white technical clown linework on deep blue blueprint grid), Castle (medieval stone turret), Even Steven (grinning round green clown), Fibonacci (golden spiral nautilus against dark sky), Flower Pot (terracotta pot with four colorful flowers), Four Fingers (white gloved hand showing four fingers).

Row2: Gluttonous Joker (orange round clown with club motif), Greedy Joker (yellow greedy sharp face with diamond motif), Green Joker (green classic jester on leafy green), Hack (wooden puppet jester holding a saw), Half Joker (torn half of a joker portrait card), Lusty Joker (pink/red jester with heart motif), Merry Andy (purple jester, eyes closed, lounging sideways).

Row3: Misprint (offset red cyan black misregistered clown face), Pareidolia (three white dots forming a face on blue night), Photograph (sepia photograph of a clown clipped to card), Scary Face (terrifying orange carnival mask), Seeing Double (overlapping purple and green double faces), Shortcut (winding mountain shortcut trail), Smeared Joker (red and black face smeared horizontally).

Row4: Smiley Face (simple large yellow smiley button), Sock and Buskin (white comedy and black tragedy theatre masks), Splash (bright blue splash of paint), Square Joker (square-headed gray checkerboard clown), Supernova (bright pink violet exploding star), The Order (five orderly ascending poker-card silhouettes in a blue geometric halo), Wrathful Joker (angry dark red clown with spade motif).

All 28 cards need full distinct illustrations with hand-made pixel details and cohesive Balatro-like restrained palette; ensure exact 7x4 grid. No UI, no price tags, no rarity labels. Do not alter the provided reference; output a new atlas of the listed 28 new cards.

## 卡包图集提示词

Use case: stylized-concept. Asset: ONE sprite atlas for 3 distinct pixel-art Joker booster pack wrappers in a Balatro / Dave the Diver Jimbo fan game. Canvas exactly 3 equal columns, 1 row. Each column aspect 3:5, whole canvas 9:5. Three fully front-facing sealed foil pouches, filling each cell, no margins or gutters, no shadows outside the cell. Retro 16-bit pixel art, crisp limited pixels, serrated/crimped sealed top and bottom, thick small-pixel outlines. Each pouch has a genuinely distinct central illustration and design, not just recolored:

Left STANDARD: crimson and vermilion harlequin diamonds, a single white smiling jester face with floppy red hat and blue ruff, cream border, tiny stars.

Middle JUMBO: blue and purple radial pattern, TWO mirrored theatre-jester profiles facing apart, gold bells and twin checkered ribbons, gold and blue crimped edges.

Right MEGA: pale ivory and silver foil, vivid multicolored swirling geometric confetti, THREE overlapping red blue gold jester masks in a radiating medallion, purple-gold geometric diamond trim.

Keep illustrations large and readable at 100 pixels tall. No text whatsoever (the app will render localized titles), no currency, no numbers, no UI, no photographic shading. Flat pixel-art sprites. Exact three equal cells to allow CSS atlas cropping.

## 标准扑克牌

`src/ui/CardFace.tsx` 使用内联 SVG 绘制四种像素花色。2～10 按点数排列，上下半部方向对应翻转；A 使用中央大花色。J、Q、K 使用双向人物：J 羽饰、Q 冠饰与花、K 王冠与剑，沿用奶油色纸张、深青色轮廓、砖红与金色点缀。角标花色同样使用 SVG，避免设备字体造成差异。所有中央插画标为装饰内容，按钮仍由点数与花色提供无障碍名称。

花色以明确轮廓区分：红桃双瓣与凹口、方块尖角、黑桃尖顶与柄、梅花三个圆瓣。角标花色放大并使用浅色留白，红黑颜色加深；人物牌中央带独立花色标记。计分小牌将点数与花色横向排列在顶部。

小屏手牌将角标点数与花色并排显示，避免放大的图标遮住中央点数排列；桌面角标保留竖排。
