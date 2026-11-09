// Built-in puzzles for puzzle mode ("ways to play").
// Each puzzle is ONE generated image laid out as a 3x3 grid of vignettes.
// Pieces are shown by cropping that image, so style and seams always match.
// Images were made with scripts/generate-puzzle.mjs (best of 3 picked by hand);
// an admin generator and a puzzles table will replace this file later.

export interface PuzzlePiece {
  name: string;        // what the kid "finds" when the piece snaps in
  subject: string;     // prompt text for this cell
  emoji: string;       // shown in name chips and as fallback art
}

// A collectible creature hidden behind one piece of each puzzle. Which piece
// differs per kid (see secretPieceFor), so siblings can't just tell each other.
export interface HiddenFriend {
  name: string;
  emoji: string;       // fallback if the image is missing
  image: string;       // path under /public
  subject: string;     // prompt text for scripts/generate-friend.mjs
}

export interface Puzzle {
  id: string;
  title: string;
  image: string;       // path under /public
  thumb: string;       // tiny blurred preview for the puzzle chooser
  scene: string;       // the shared world AND the single moment it captures
  layout: string[];    // scene-specific composition rules
  pieces: PuzzlePiece[]; // row-major, 9 entries
  retired?: boolean;   // no longer offered; kept so kids mid-puzzle can finish it
  free?: boolean;      // starter puzzle; the rest are unlocked with points or a wheel key
  keyAfter?: number;   // secret puzzle: key only, offered once this many puzzles are finished
  friend: HiddenFriend;
}

// Price of a locked puzzle. A kid earns roughly this much over the nine
// brushes it takes to finish a puzzle (per-brush points, chest and the
// puzzle-complete bonus), so finishing one pays for the next.
export const PUZZLE_UNLOCK_COST = 250;

export const PUZZLES: Puzzle[] = [
  {
    id: 'treetop-village',
    free: true,
    title: 'Treetop Village',
    image: '/puzzles/treetop-village.jpg',
    thumb: '/puzzles/treetop-village-thumb.jpg',
    scene:
      'a cozy woodland village on a steep hillside on festival morning, with a winding dirt path that zigzags from the top-left down to the bottom-right and everyone hurrying to the party.',
    layout: [
      'No horizontal bands: the hillside, the zigzag path and a stream create strong diagonal lines through the whole picture.',
      'Mix near and far: some subjects are big and close to the viewer, others smaller and further back up the hill.',
      'A zipline, a rope bridge, the path and the stream connect neighbouring cells.',
    ],
    friend: { name: 'Glimmer the Forest Sprite', emoji: '🧚', image: '/puzzles/friends/treetop-village.webp', subject: 'a tiny glowing forest sprite with leaf wings, an acorn cap hat and a lantern' },
    pieces: [
      { name: 'Hoot the Owl', subject: 'an owl mail carrier swooping down with a bag of party invitations flying out behind it', emoji: '🦉' },
      { name: 'The Treehouse', subject: 'a round treehouse with glowing lanterns and bunting, a door flung open', emoji: '🏡' },
      { name: 'Zippy the Squirrel', subject: 'a squirrel whizzing down a zipline between two trees, tail streaming', emoji: '🐿️' },
      { name: 'Fern the Fox', subject: 'a fox skipping across a wobbly rope bridge carrying a cake', emoji: '🦊' },
      { name: 'Bun Cart', subject: 'two bunnies rolling down the path in a wooden cart full of flowers, wheels kicking up dust', emoji: '🐰' },
      { name: 'Splash Falls', subject: 'a little waterfall where a frog is cannonballing into the pool', emoji: '🐸' },
      { name: 'Mushroom House', subject: 'a red mushroom cottage with a curling smoke chimney and a mouse waving from the window', emoji: '🍄' },
      { name: 'Hedgy\'s Picnic', subject: 'a hedgehog spreading a checkered picnic blanket that billows in the breeze', emoji: '🦔' },
      { name: 'Duckling Parade', subject: 'a mother duck leading four ducklings across stepping stones in the stream', emoji: '🦆' },
    ],
  },
  {
    id: 'windy-cove',
    free: true,
    title: 'Windy Cove',
    image: '/puzzles/windy-cove.jpg',
    thumb: '/puzzles/windy-cove-thumb.jpg',
    scene:
      'a seaside cove on a gusty, sparkling afternoon, at the exact moment a whale leaps out of the sea and everyone turns to cheer. Wind, spray and movement everywhere.',
    layout: [
      'Sky in the upper part, one sea surface across the middle, underwater below. The sea surface is a single continuous line, but it can swell and curve with big waves rather than being ruler-straight.',
      'The center whale breaches right through the sea surface: half in the air, half underwater, with a huge arcing splash.',
      'The kite string runs from the kite down to the puffin in the sailboat. The lighthouse beam sweeps toward the whale. The sun\'s rays slant diagonally across the sky.',
    ],
    friend: { name: 'Pearl the Baby Sea Dragon', emoji: '🐉', image: '/puzzles/friends/windy-cove.webp', subject: 'a baby sea dragon, turquoise with frilly fins, hugging a shiny pearl' },
    pieces: [
      { name: 'Kiki the Kite', subject: 'a red kite swooping in a loop, its string trailing down toward the sailboat below', emoji: '🪁' },
      { name: 'Pip the Balloon', subject: 'a rainbow hot air balloon tipping in the wind, a little bear in the basket waving and holding on to its hat', emoji: '🎈' },
      { name: 'Sunny', subject: 'a smiling sun bursting out from behind a cloud, three seagulls tumbling past in the gust', emoji: '☀️' },
      { name: 'Captain Puff', subject: 'a little red sailboat heeled over by the wind, spray at the bow, the puffin captain gripping the wheel with one wing and the kite string with the other', emoji: '⛵' },
      { name: 'Wally the Whale', subject: 'a happy blue whale leaping mid-breach, water streaming off it', emoji: '🐳' },
      { name: 'Lulu the Lighthouse', subject: 'a striped lighthouse on a rocky islet, its beam swinging toward the whale, a crab jumping and cheering on the rocks', emoji: '🗼' },
      { name: 'Shelly the Turtle', subject: 'a sea turtle diving downward at an angle, trailing bubbles, following a trail of glowing shells', emoji: '🐢' },
      { name: 'Ollie the Octopus', subject: 'an octopus bursting out of a treasure chest, tentacles flinging pearls and shells in every direction', emoji: '🐙' },
      { name: 'Sami the Seahorse', subject: 'a seahorse racing upward through a coral arch while tiny fish swirl around it in a spiral', emoji: '🐠' },
    ],
  },
  {
    id: 'space-party',
    title: 'Space Party',
    image: '/puzzles/space-party.jpg',
    thumb: '/puzzles/space-party-thumb.jpg',
    scene:
      'outer space on the night of a big birthday party at a friendly space station, at the exact moment a rocket blasts off with the cake and everyone zooms in to celebrate. Stars, swirls and streamers everywhere.',
    layout: [
      'Deep blue-purple space with colourful planets and nebula swirls; no ground and no horizon.',
      'A long glowing streamer of party lights loops through the whole picture from the top-left to the bottom-right, tying the friends together.',
      'The center rocket blasts upward on a curly exhaust trail that drifts into the cells below it.',
    ],
    friend: { name: 'Zoop the Space Puff', emoji: '✨', image: '/puzzles/friends/space-party.webp', subject: 'a tiny round fluffy yellow space puff with bobbly glowing antennae and a party hat' },
    pieces: [
      { name: 'Comet Pup', subject: 'a puppy in a space helmet riding a comet like a surfboard, ears flapping', emoji: '☄️' },
      { name: 'Ringo the Planet', subject: 'a smiling ringed planet with a cat skating around its rings', emoji: '🪐' },
      { name: 'Luna Bunny', subject: 'a bunny in a spacesuit bouncing high off a crescent moon', emoji: '🌙' },
      { name: 'Zippy UFO', subject: 'a little green alien waving from a spinning flying saucer, its beam lifting party balloons', emoji: '🛸' },
      { name: 'Party Rocket', subject: 'a red-and-white rocket blasting off with a giant birthday cake strapped on top', emoji: '🚀' },
      { name: 'DJ Bolt', subject: 'a round robot DJ on a space station deck, headphones on, music notes flying', emoji: '🤖' },
      { name: 'Astro Max', subject: 'an astronaut kid floating upside down holding a bunch of star-shaped balloons', emoji: '🧑‍🚀' },
      { name: 'Hammy the Miner', subject: 'a hamster in a tiny helmet riding a cart across a bumpy asteroid full of sparkly gems', emoji: '🐹' },
      { name: 'Twinkle the Star Whale', subject: 'a glowing space whale swimming through the stars, blowing a fountain of sparkles', emoji: '🐋' },
    ],
  },
  {
    id: 'dino-valley',
    title: 'Dino Valley',
    image: '/puzzles/dino-valley.jpg',
    thumb: '/puzzles/dino-valley-thumb.jpg',
    scene:
      'a sunny prehistoric valley on splash day, at the exact moment a baby T-rex cannonballs into the lagoon and all the dinosaurs rush in to play. Spray, leaves and excitement everywhere.',
    layout: [
      'A river winds in an S-curve from a waterfall at the top-right down through the middle to a big lagoon at the bottom.',
      'Tall palm-like ferns and a distant gentle smoking mountain in the upper part; no harsh lava.',
      'Mix near and far: some dinosaurs big and close, others smaller up the valley.',
    ],
    friend: { name: 'Pebble the Hatchling', emoji: '🥚', image: '/puzzles/friends/dino-valley.webp', subject: 'a baby dinosaur peeking out of a cracked speckled egg, waving one little arm' },
    pieces: [
      { name: 'Pip the Pterodactyl', subject: 'a pterodactyl swooping down carrying a picnic basket in its feet', emoji: '🦅' },
      { name: 'Longneck Lou', subject: 'a tall brachiosaurus stretching to munch leaves from a giant fern tree', emoji: '🦕' },
      { name: 'Rumble Falls', subject: 'a waterfall tumbling off a cliff with a rainbow in its spray', emoji: '🌈' },
      { name: 'Trixie Triceratops', subject: 'a triceratops pushing a wooden cart piled with fruit along the riverbank', emoji: '🍉' },
      { name: 'Splash the T-rex', subject: 'a baby T-rex mid-cannonball into the river, arms tucked, huge splash', emoji: '🦖' },
      { name: 'Steggy Slide', subject: 'a stegosaurus whooshing down a muddy riverbank slide on its belly', emoji: '🦎' },
      { name: 'The Nest', subject: 'a nest of eggs hatching, three baby dinosaurs popping out and cheering', emoji: '🥚' },
      { name: 'Dot the Drummer', subject: 'a little dinosaur floating on a log raft, drumming on the logs', emoji: '🥁' },
      { name: 'Lagoon Turtle', subject: 'a giant prehistoric turtle in the lagoon giving tiny dinosaurs a ride on its shell', emoji: '🐢' },
    ],
  },
  {
    id: 'snow-day',
    title: 'Snow Day',
    image: '/puzzles/snow-day.jpg',
    thumb: '/puzzles/snow-day-thumb.jpg',
    scene:
      'a snowy arctic hillside on the first snow day, at the exact moment a big snowball fight breaks out and everyone dives into the fun. Flying snow, scarves and cheeks pink with cold.',
    layout: [
      'A long sledding track zigzags down the hill from the top-left to the bottom-right, with an icy blue bay along the bottom.',
      'Soft falling snowflakes everywhere and a pale aurora glowing in the sky.',
      'Snowballs fly across cell edges between the friends.',
    ],
    friend: { name: 'Fluff the Baby Yeti', emoji: '❄️', image: '/puzzles/friends/snow-day.webp', subject: 'a baby yeti with fluffy white fur, a striped scarf and rosy cheeks, holding a snowball' },
    pieces: [
      { name: 'Aurora Owl', subject: 'a snowy owl gliding under a green and pink aurora', emoji: '🌌' },
      { name: 'Igloo House', subject: 'a cozy igloo with a glowing round window and smoke curling from a tiny chimney', emoji: '🧊' },
      { name: 'Flurry the Fox', subject: 'an arctic fox leaping to catch a flying snowball', emoji: '🦊' },
      { name: 'Penguin Sled Team', subject: 'three penguins zooming down the hill on one sled, scarves streaming', emoji: '🐧' },
      { name: 'Bjorn the Polar Bear', subject: 'a polar bear cub throwing a snowball with a big grin', emoji: '🐻‍❄️' },
      { name: 'Frosty Friend', subject: 'a snowman with a carrot nose waving a stick arm as a snowball whizzes by', emoji: '⛄' },
      { name: 'Wally the Walrus', subject: 'a walrus building a wobbly snow fort and ducking behind it', emoji: '🦭' },
      { name: 'Splashy Seals', subject: 'two seals splashing and playing in the icy pool', emoji: '💦' },
      { name: 'Nori the Narwhal', subject: 'a narwhal popping out of the icy bay with a snowball balanced on its horn', emoji: '🦄' },
    ],
  },
  {
    id: 'cloud-castle',
    title: 'Cloud Castle',
    image: '/puzzles/cloud-castle.jpg',
    thumb: '/puzzles/cloud-castle-thumb.jpg',
    scene:
      'a kingdom of fluffy clouds high in the sky at sunrise, at the exact moment a friendly dragon swoops through a rainbow and everyone flies along behind it in a grand sky parade.',
    layout: [
      'Pastel sunrise sky with big puffy clouds at different heights; no ground anywhere.',
      'A long rainbow ribbon trails behind the dragon and swoops through the whole picture from the top-left to the bottom-right.',
      'Clouds overlap cell edges so neighbours share the same cloud banks.',
    ],
    friend: { name: 'Nimbus the Cloud Kitten', emoji: '☁️', image: '/puzzles/friends/cloud-castle.webp', subject: 'a kitten made of a fluffy cloud, with a little rainbow tail and sparkly eyes' },
    pieces: [
      { name: 'Puff the Dragon', subject: 'a small round green dragon swooping through a rainbow, ribbon streaming from its tail', emoji: '🐉' },
      { name: 'Sky Castle', subject: 'a pink and white castle with pointy towers sitting on a big cloud, flags flapping', emoji: '🏰' },
      { name: 'Captain Goose', subject: 'a goose in a captain hat steering a little flying ship with propellers', emoji: '🪿' },
      { name: 'Bounce Bear', subject: 'a teddy bear bouncing on a springy cloud like a trampoline, arms up', emoji: '🧸' },
      { name: 'Wishing Star', subject: 'a big smiling star tossing sparkles down onto the parade', emoji: '⭐' },
      { name: 'Balloon Bunny', subject: 'a bunny floating up holding a bunch of colourful balloons', emoji: '🎈' },
      { name: 'Paper Plane Pip', subject: 'a mouse in goggles zooming on a folded paper plane', emoji: '✈️' },
      { name: 'Wind Whistler', subject: 'a cheeky cloud with puffed cheeks blowing a gust that sends leaves and feathers spinning', emoji: '🌬️' },
      { name: 'Hoot the Pilot', subject: 'an owl in a scarf flying a tiny hot air balloon basket', emoji: '🦉' },
    ],
  },
  {
    id: 'bug-garden',
    title: 'Bug Garden',
    image: '/puzzles/bug-garden.jpg',
    thumb: '/puzzles/bug-garden-thumb.jpg',
    scene:
      'a sunny vegetable garden seen up close at bug size, with giant leaves, flowers and dewdrops, at the exact moment the bugs hold a big race along a winding vine.',
    layout: [
      'Giant green leaves, flower heads and plant stems fill the frame; sky peeks through only at the top.',
      'One curling vine racetrack winds through every cell, from the top-left down to the bottom-right finish line of pebbles.',
      'Dewdrops, petals and pollen float across cell edges.',
    ],
    friend: { name: 'Goldie the Golden Beetle', emoji: '🪲', image: '/puzzles/friends/bug-garden.webp', subject: 'a shiny golden beetle wearing a tiny crown, sitting on a leaf' },
    pieces: [
      { name: 'Bumble Ben', subject: 'a fuzzy bumblebee waving a checkered flag to start the race', emoji: '🐝' },
      { name: 'Sunny Sunflower', subject: 'a giant sunflower with a happy face leaning in to watch', emoji: '🌻' },
      { name: 'Flutter', subject: 'a butterfly with bright wings swooping low over the vine', emoji: '🦋' },
      { name: 'Speedy Snail', subject: 'a snail with a racing stripe on its shell zooming along on a skateboard', emoji: '🐌' },
      { name: 'Lady Dot', subject: 'a ladybug riding a dandelion seed like a glider', emoji: '🐞' },
      { name: 'Hopper', subject: 'a grasshopper leaping high over a dewdrop, legs stretched', emoji: '🦗' },
      { name: 'Ant Crew', subject: 'three ants pushing a giant strawberry like a cart along the vine', emoji: '🐜' },
      { name: 'Wiggles the Worm', subject: 'a pink worm popping out of a carrot top, cheering', emoji: '🪱' },
      { name: 'Glow Gus', subject: 'a firefly with a glowing tail holding up a little trophy at the finish line', emoji: '🏆' },
    ],
  },
  {
    id: 'farm-fair',
    title: 'Farm Fair',
    image: '/puzzles/farm-fair.jpg',
    thumb: '/puzzles/farm-fair-thumb.jpg',
    scene:
      'a sunny country farm on fair day with rolling green hills, a red barn and bunting, at the exact moment the animals burst out of the barn for the big fair parade.',
    layout: [
      'Rolling green hills with a blue sky and a few clouds in the top third only.',
      'A winding dirt path runs from the barn at the top-center down through the whole picture to the bottom-right, with the parade moving along it.',
      'Strings of colourful bunting flags cross between neighbouring cells.',
    ],
    friend: { name: 'Buttercup the Chick', emoji: '🐣', image: '/puzzles/friends/farm-fair.webp', subject: 'a tiny golden-yellow chick wearing a flower bonnet, peeping happily' },
    pieces: [
      { name: 'Rooster Ray', subject: 'a rooster on a fence post crowing loudly, feathers puffed', emoji: '🐓' },
      { name: 'Big Red Barn', subject: 'a big red barn with its doors flung open and hay flying out', emoji: '🛖' },
      { name: 'Windy Mill', subject: 'a windmill with sails spinning fast, a bird riding one sail', emoji: '🌾' },
      { name: 'Pig Pal', subject: 'a pig sliding happily down a muddy hill on its belly', emoji: '🐷' },
      { name: 'Tractor Ted', subject: 'a little red tractor pulling a wagon full of pumpkins, a puppy driving', emoji: '🚜' },
      { name: 'Goat Jump', subject: 'a goat leaping over a hay bale mid-jump', emoji: '🐐' },
      { name: 'Duck Band', subject: 'three ducklings marching in a line playing tiny drums and trumpets', emoji: '🦆' },
      { name: 'Moo Moo', subject: 'a cow in a flower crown waving a ribbon prize', emoji: '🐄' },
      { name: 'Lamb Loop', subject: 'a fluffy lamb rolling down the hill like a ball, giggling', emoji: '🐑' },
    ],
  },
  {
    id: 'toy-shop',
    title: 'Toy Shop Night',
    image: '/puzzles/toy-shop.jpg',
    thumb: '/puzzles/toy-shop-thumb.jpg',
    scene:
      'a cosy old toy shop at night, lit by moonlight from the window and a warm lamp, at the exact moment the toys come alive and start a big game of chase across the shelves.',
    layout: [
      'Wooden shelves at different heights and a big moonlit window at the top; warm golden lamplight.',
      'A toy train track loops and climbs through the whole picture from the top-left down to the bottom-right, crossing between shelves.',
      'Strings, ribbons and yo-yo strings cross cell edges to tie neighbours together.',
    ],
    friend: { name: 'Tick the Wind-up Penguin', emoji: '🐧', image: '/puzzles/friends/toy-shop.webp', subject: 'a wind-up tin toy penguin with a brass key on its back, mid-waddle' },
    pieces: [
      { name: 'Captain Teddy', subject: 'a teddy bear swinging from the curtain on a yo-yo string', emoji: '🧸' },
      { name: 'Moon Window', subject: 'a big round moon smiling through the shop window, a cat silhouette on the sill', emoji: '🌙' },
      { name: 'Choo Choo', subject: 'a little wind-up train puffing steam and zooming around a loop', emoji: '🚂' },
      { name: 'Robo Rex', subject: 'a tin robot dinosaur chasing a bouncing ball', emoji: '🦖' },
      { name: 'Dolly Dash', subject: 'a rag doll riding a rocking horse at full gallop', emoji: '🐴' },
      { name: 'Spinning Top', subject: 'a striped spinning top whirling with sparkles flying off it', emoji: '🌀' },
      { name: 'Block Tower', subject: 'a wobbly tower of letter blocks tipping over while a mouse catches the top block', emoji: '🧱' },
      { name: 'Jack-in-the-Box', subject: 'a smiling jack-in-the-box springing up and waving', emoji: '🎁' },
      { name: 'Loopy Plane', subject: 'a toy airplane looping overhead trailing a ribbon', emoji: '🛩️' },
    ],
  },
  // ---- Secret puzzles: opened only with a 🔑 key, and only once the kid has
  // finished 1, 2 and 3 puzzles respectively. ----
  {
    id: 'pirate-ship',
    keyAfter: 1,
    title: 'Pirate Ship',
    image: '/puzzles/pirate-ship.jpg',
    thumb: '/puzzles/pirate-ship-thumb.jpg',
    scene:
      'a friendly pirate ship crew of animals on a bright, breezy day, at the exact moment they spot treasure island and everyone rushes to look. Billowing sails, rolling waves and spray everywhere.',
    layout: [
      'The ship is seen from a low, tilted angle, riding up a big wave, so its deck slants diagonally across the middle of the picture.',
      'Tall masts and billowing sails fill the top; the treasure island with one palm tree is small and far away in one top corner.',
      'Ropes, the rigging net, a flag streaming in the wind and the spyglass\'s line of sight cross cell edges to tie neighbours together.',
    ],
    friend: { name: 'Bubbles the Baby Kraken', emoji: '🦑', image: '/puzzles/friends/pirate-ship.webp', subject: 'a tiny friendly baby kraken, coral pink with big shiny eyes, wearing a little captain\'s hat and blowing bubbles' },
    pieces: [
      { name: 'Polly the Parrot', subject: 'a green parrot in a tiny bandana swooping down from the crow\'s nest, squawking happily', emoji: '🦜' },
      { name: 'The Lookout', subject: 'a raccoon in the crow\'s nest peering through a long brass spyglass toward the island', emoji: '🔭' },
      { name: 'Treasure Island', subject: 'a little sandy island with one palm tree and a big X in the sand, far away on the sparkling sea', emoji: '🏝️' },
      { name: 'Rope Swing', subject: 'a monkey swinging across the deck on a rope, one arm stretched out', emoji: '🐒' },
      { name: 'Captain Whiskers', subject: 'a cat captain in a big feathered hat at the ship\'s wheel, pointing ahead', emoji: '🐱' },
      { name: 'Jolly Flag', subject: 'a striped pirate flag with a smiling sun on it, streaming in the wind from the back of the ship', emoji: '🏴‍☠️' },
      { name: 'Map Mouse', subject: 'a mouse holding up a huge treasure map that flaps in the breeze', emoji: '🗺️' },
      { name: 'Treasure Chest', subject: 'an open treasure chest spilling shiny gold coins and pearls across the deck', emoji: '💰' },
      { name: 'Splashy Dolphins', subject: 'two dolphins leaping alongside the ship through the bow spray', emoji: '🐬' },
    ],
  },
  {
    id: 'robot-workshop',
    keyAfter: 2,
    title: 'Robot Workshop',
    image: '/puzzles/robot-workshop.jpg',
    thumb: '/puzzles/robot-workshop-thumb.jpg',
    scene:
      'a bright, cluttered inventor\'s workshop full of friendly robots, at the exact moment the giant new robot switches on for the first time and sparks, gears and confetti burst everywhere.',
    layout: [
      'A curving conveyor belt sweeps from the top-left down to the bottom-right, with gadgets riding along it.',
      'Workbenches, shelves and pipes at different heights and depths; big round windows let in warm daylight from above.',
      'Cables, pipes, sparks and flying gears cross cell edges to tie neighbours together.',
    ],
    friend: { name: 'Sprocket the Robo-Pup', emoji: '🤖', image: '/puzzles/friends/robot-workshop.webp', subject: 'a small round robot puppy with floppy metal ears, a wagging spring tail and glowing blue eyes' },
    pieces: [
      { name: 'Whirly Drone', subject: 'a little propeller drone zooming past carrying a wrench', emoji: '🚁' },
      { name: 'Gear Wheel', subject: 'a huge spinning golden gear with a hamster running inside it like a wheel', emoji: '⚙️' },
      { name: 'Professor Owl', subject: 'an owl inventor in goggles cheering with a clipboard', emoji: '🦉' },
      { name: 'Bolt the Helper', subject: 'a boxy robot with extendable arms juggling bolts and screws', emoji: '🔩' },
      { name: 'Big Botty', subject: 'a giant friendly robot switching on, eyes lighting up, arms raised in a wave', emoji: '🤖' },
      { name: 'Spark Station', subject: 'a tesla coil fizzing with harmless purple sparks while a cat\'s fur stands up', emoji: '⚡' },
      { name: 'Roller Rover', subject: 'a little wheeled robot zooming along the conveyor belt with a tiny flag', emoji: '🛞' },
      { name: 'Magnet Mouse', subject: 'a mouse holding a giant horseshoe magnet that pulls spoons and paperclips flying toward it', emoji: '🧲' },
      { name: 'Bubble Bot', subject: 'a round robot blowing a stream of soap bubbles from a pipe', emoji: '🫧' },
    ],
  },
  {
    id: 'dragon-mountain',
    keyAfter: 3,
    title: 'Dragon Mountain',
    image: '/puzzles/dragon-mountain.jpg',
    thumb: '/puzzles/dragon-mountain-thumb.jpg',
    scene:
      'a magical mountain at sunset where friendly dragons live, at the exact moment the mother dragon lifts off from the peak and every dragon soars up after her. Wind, glowing embers and swirling clouds everywhere.',
    layout: [
      'One tall mountain rises diagonally from the bottom-left to a peak near the top-right, with waterfalls and caves on its slopes.',
      'A warm orange and purple sunset sky with swirling clouds; some dragons big and close, others small and far away.',
      'Trails of sparkly embers, waterfalls, wings and long tails cross cell edges to tie neighbours together.',
    ],
    friend: { name: 'Ember the Baby Phoenix', emoji: '🐦‍🔥', image: '/puzzles/friends/dragon-mountain.webp', subject: 'a fluffy baby phoenix chick with soft red, orange and gold feathers and a tiny flame-shaped crest' },
    pieces: [
      { name: 'Cloud Rider', subject: 'a small blue dragon surfing on a swirling cloud, wings spread', emoji: '☁️' },
      { name: 'Sky Mama', subject: 'a big gentle green dragon lifting off from the peak, wings wide open against the sunset', emoji: '🐉' },
      { name: 'Sunset Peak', subject: 'the snowy mountain peak glowing gold, with a little dragon flag fluttering on top', emoji: '🏔️' },
      { name: 'Twin Wings', subject: 'two baby dragons doing a loop-the-loop around each other, leaving a sparkle trail', emoji: '✨' },
      { name: 'Crystal Cave', subject: 'a glowing cave full of colorful crystals with a dragon peeking out and waving', emoji: '💎' },
      { name: 'Rainbow Falls', subject: 'a tall waterfall with a rainbow in its spray and a dragon splashing in the pool', emoji: '🌈' },
      { name: 'Egg Nest', subject: 'a cozy nest with a spotted dragon egg cracking open and a tiny dragon popping its head out', emoji: '🥚' },
      { name: 'Knight Bunny', subject: 'a bunny in shiny toy armor riding a little dragon like a pony', emoji: '🐰' },
      { name: 'Ember Lizard', subject: 'a tiny red dragon blowing a smoke ring that floats away', emoji: '🔥' },
    ],
  },
  {
    // Retired: too close to Windy Cove. Still loads for anyone already on it.
    id: 'sunny-cove',
    retired: true,
    title: 'Sunny Cove',
    image: '/puzzles/sunny-cove.jpg',
    thumb: '/puzzles/sunny-cove-thumb.jpg',
    scene:
      'a calm sunny seaside cove seen as a cross-section, with three bands from top to bottom: open sky, the sea surface, and the underwater world.',
    layout: [
      'The top row is ONLY open sky with soft clouds. No water, no waves, no horizon, no land anywhere in the top third.',
      'There is exactly ONE waterline: a single straight horizontal sea surface across the full width at about 55% of the image height. The middle-row subjects sit on it.',
      'Everything below the waterline, including the whole bottom row, is underwater.',
    ],
    friend: { name: 'Coral the Rainbow Crab', emoji: '🦀', image: '/puzzles/friends/sunny-cove.webp', subject: 'a hermit crab with a sparkly rainbow shell, waving a claw' },
    pieces: [
      { name: 'Kiki the Kite', subject: 'a red diamond kite with a long bow-tie tail, flying high', emoji: '🪁' },
      { name: 'Pip the Balloon', subject: 'a rainbow hot air balloon with a happy face drifting through fluffy clouds', emoji: '🎈' },
      { name: 'Sunny', subject: 'a smiling sun with three seagulls flying past', emoji: '☀️' },
      { name: 'Captain Puff', subject: 'a little red sailboat with a puffin captain at the wheel', emoji: '⛵' },
      { name: 'Wally the Whale', subject: 'a sleepy blue whale spouting a fountain of water', emoji: '🐳' },
      { name: 'Lulu the Lighthouse', subject: 'a friendly striped lighthouse on a tiny rocky island, with a crab waving from the rocks', emoji: '🗼' },
      { name: 'Shelly the Turtle', subject: 'a sea turtle swimming past swaying kelp', emoji: '🐢' },
      { name: 'Ollie the Octopus', subject: 'an octopus peeking out of an open treasure chest full of shells', emoji: '🐙' },
      { name: 'Sami the Seahorse', subject: 'a seahorse curled around pink coral with tiny fish', emoji: '🐠' },
    ],
  },
];

export const PIECES_PER_PUZZLE = 9;

// Four 30-second brushing stages, in the order dentists teach them. Each one
// scrubs the foam off one quarter of the day's piece.
export const BRUSH_STAGES = [
  { label: 'top left' },
  { label: 'top right' },
  { label: 'bottom left' },
  { label: 'bottom right' },
];

// Which piece hides the friend, per kid and puzzle. Stable, but different for
// each child, so it stays a surprise.
export function secretPieceFor(childId: string, puzzleId: string): number {
  let h = 2166136261;
  for (const c of `${childId}:${puzzleId}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % PIECES_PER_PUZZLE;
}

export function buildFriendPrompt(p: Puzzle): string {
  return `A single cute collectible creature for a children's app: ${p.friend.subject}. It is the secret friend hidden in a "${p.title}" picture (${p.scene.split(',')[0]}).

Full body, centered, filling most of the frame, facing the viewer with a big friendly smile. Bright, warm children's picture-book style with soft rounded shapes, gentle gradients and expressive eyes, suitable for ages 3-8.
Plain flat soft cream background with nothing else in it. No text, letters, border or frame.`;
}

export function getPuzzleById(id: string | null | undefined): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}

// Background music while brushing in puzzle mode: an existing ElevenLabs
// track reused from story mode: "The Mystery of the Stinky Sea Serpent", the
// loudest and busiest of the six (about 117 BPM). It fades in over ~1.5s and
// out over the last ~2s, so playback skips those edges (see useBackgroundMusic).
export const PUZZLE_MUSIC_URL: string | null =
  'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/story-music/1bf5d747-d50e-4578-a7a3-64a0fe0d76be.mp3';

// ---------- Voice lines ----------
// Pre-recorded once with Gemini TTS (scripts/generate-puzzle-voice.mjs) and
// served as static files, so brushing never spends the daily TTS quota.
// If a clip is missing the app falls back to the device's own speech voice.

export interface VoiceLine { key: string; text: string }

export const stageVoice = (stage: number): VoiceLine => ({
  key: `stage-${stage}`,
  text: stage === 0
    ? `Let's start with your ${BRUSH_STAGES[0].label} teeth!`
    : `Now brush your ${BRUSH_STAGES[stage].label} teeth!`,
});

export const getReadyVoice: VoiceLine = { key: 'get-ready', text: 'Get ready!' };
export const greatJobVoice: VoiceLine = { key: 'great-job', text: 'Great job!' };

// A short celebratory fanfare played when a piece is revealed.
export const FANFARE_URL = '/puzzles/sfx/fanfare.mp3';

export const foundVoice = (puzzle: Puzzle, index: number): VoiceLine => ({
  key: `${puzzle.id}-${index}`,
  text: `You found ${puzzle.pieces[index].name}!`,
});

export const finishedVoice = (puzzle: Puzzle): VoiceLine => ({
  key: `${puzzle.id}-done`,
  text: `You finished ${puzzle.title}! Amazing brushing!`,
});

export const friendVoice = (puzzle: Puzzle): VoiceLine => ({
  key: `${puzzle.id}-friend`,
  text: `Wow, a hidden friend! It's ${puzzle.friend.name}!`,
});

export const voiceClipUrl = (key: string) => `/puzzles/voice/${key}.mp3`;

export function allVoiceLines(): VoiceLine[] {
  return [
    getReadyVoice,
    greatJobVoice,
    ...BRUSH_STAGES.map((_, i) => stageVoice(i)),
    ...PUZZLES.flatMap((p) => [...p.pieces.map((_, i) => foundVoice(p, i)), finishedVoice(p)]),
    // Newer lines last, so the daily TTS quota records the core lines first.
    ...PUZZLES.map((p) => friendVoice(p)),
  ];
}

const POSITIONS = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

// The prompt that makes one image work as nine pieces.
// The trick: each cell owns one subject (so a piece reads alone), but the
// scene is one dramatic moment with things crossing cell edges (so the whole
// reads as a picture, not a grid of characters on a backdrop).
export function buildPuzzlePrompt(p: Puzzle): string {
  const cells = p.pieces
    .map((piece, i) => `- ${POSITIONS[i]} cell: ${piece.subject}`)
    .join('\n');
  const layout = p.layout.map((l) => `- ${l}`).join('\n');
  return `Create a single square children's picture-book illustration of ${p.scene}

The image is secretly a 3x3 jigsaw puzzle: imagine it divided into nine equal square cells. Each cell has ONE hero subject, whose face and body stay fully inside that cell so the cell still reads as a little picture on its own:
${cells}

Make it feel like one lively, dynamic scene, NOT a tidy grid of characters on a backdrop:
- Capture one exciting moment. Every subject is mid-action, with motion lines, wind, splashes or flying bits.
- Do not line subjects up in neat rows at the same height or the same size. Vary scale and depth: some big and close, some small and far.
- Use a sweeping diagonal or curving composition, with a dynamic, slightly low camera angle.
- Let secondary things (strings, beams, paths, splashes, tails, flying objects) cross cell edges to tie neighbours together, and let subjects react to each other.
${layout}

Shared lighting, palette and continuous background across every cell edge. Do NOT draw grid lines, borders, frames, panels, gutters, seams or jigsaw outlines. No text or letters.

Style: bright, warm, soft rounded shapes, gentle gradients, friendly expressive faces, suitable for ages 3-8.`;
}
