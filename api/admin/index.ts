import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './lib/db.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'brushquest-admin';

// Static data for migration
const worlds = [
  { name: 'magical-forest', displayName: 'Magical Forest', description: 'Talking trees and friendly creatures', theme: 'magical-forest', unlockCost: 0, isStarter: true },
  { name: 'space-station', displayName: 'Space Station Omega', description: 'Adventures among the stars', theme: 'space', unlockCost: 0, isStarter: true },
  { name: 'underwater-kingdom', displayName: 'Underwater Kingdom', description: 'Mermaids and sunken treasure', theme: 'underwater', unlockCost: 100, isStarter: false },
  { name: 'dinosaur-valley', displayName: 'Dinosaur Valley', description: 'Time travel to prehistoric times', theme: 'dinosaurs', unlockCost: 150, isStarter: false },
  { name: 'pirate-cove', displayName: 'Pirate Cove', description: 'Treasure maps and sea adventures', theme: 'pirates', unlockCost: 150, isStarter: false },
];

// Complete "Glowing Flowers" story
const glowingFlowersStory = {
  title: 'The Mystery of the Glowing Flowers',
  description: 'Help a lost butterfly find her way home through the enchanted forest.',
  chapters: [
    {
      chapterNumber: 1,
      title: 'The Strange Discovery',
      recap: null,
      cliffhanger: 'But just as they started to follow the glowing path, they heard a tiny voice crying for help...',
      nextChapterTeaser: 'Who is lost in the Magical Forest? Find out next time!',
      segments: [
        { text: '[CHILD] was walking through the Magical Forest with [PET] when something caught their eye. Between the tall trees, there was a soft, colorful glow!', brushingZone: null, brushingPrompt: null, imagePrompt: 'A mystical enchanted forest with tall ancient trees, soft golden sunlight filtering through leaves, and a mysterious colorful glow emanating from between the trees in the distance' },
        { text: '"Look at that!" whispered [CHILD]. [PET] bounced excitedly. They had never seen flowers that glowed like little rainbows before.', brushingZone: 'top-left', brushingPrompt: 'Quick! Brush your top left teeth while [PET] leads the way!', imagePrompt: 'Close-up of magical glowing flowers in a forest clearing, each petal shimmering with rainbow colors like little lanterns, soft bioluminescent light, whimsical and enchanting atmosphere' },
        { text: 'As they got closer, they saw that the flowers were humming a tiny song. "These must be Melody Blossoms," said a wise old owl from a nearby branch.', brushingZone: null, brushingPrompt: null, imagePrompt: 'A wise old owl with soft feathers perched on a mossy branch, looking down kindly at glowing musical flowers below, visible sound waves or musical notes floating in the air, magical forest setting' },
        { text: 'The owl explained that these special flowers only bloom when someone needs help. "Someone in the forest is lost," hooted the owl.', brushingZone: 'top-right', brushingPrompt: 'Now brush your top right teeth while we listen to the owl!', imagePrompt: 'The wise owl speaking with concern, the glowing Melody Blossoms below pulsing with urgency, moonlight filtering through trees, mysterious and slightly worried atmosphere in the magical forest' },
        { text: '[CHILD] and [PET] looked at each other. They knew they had to help! The flowers seemed to point deeper into the forest.', brushingZone: 'bottom-left', brushingPrompt: 'Scrub your bottom left teeth - we need to hurry!', imagePrompt: 'A pathway of glowing Melody Blossoms creating a luminous trail leading deeper into the enchanted forest, flowers bending and pointing the way, magical mist, sense of adventure and urgency' },
      ],
    },
    {
      chapterNumber: 2,
      title: 'The Lost Butterfly',
      recap: '[CHILD] and [PET] discovered magical glowing Melody Blossoms in the forest. A wise owl told them the flowers only bloom when someone needs help!',
      cliffhanger: 'Suddenly, all the flowers started glowing brighter and pointing in a new direction!',
      nextChapterTeaser: 'Will the magic flowers lead them to Rainbow Meadow? Find out next time!',
      segments: [
        { text: '[CHILD] and [PET] followed the tiny voice through the glowing flowers. There, sitting on a mushroom, was the smallest butterfly they had ever seen!', brushingZone: null, brushingPrompt: null, imagePrompt: 'A tiny delicate butterfly with iridescent wings sitting sadly on a spotted red and white mushroom, surrounded by glowing flowers, dewdrops on petals, soft magical forest lighting' },
        { text: '"I\'m Flutter," sniffled the butterfly. "I was flying home but a big wind blew me far away. Now I don\'t know where I am!"', brushingZone: 'top-left', brushingPrompt: 'Brush your top left teeth while [PET] comforts Flutter!', imagePrompt: 'Close-up of Flutter the tiny butterfly looking sad with a small tear, delicate translucent wings drooping, sitting among oversized forest plants, emotional and sympathetic scene' },
        { text: '[PET] gently patted Flutter with a friendly nudge. "Don\'t worry," said [CHILD]. "We\'ll help you find your way home!"', brushingZone: null, brushingPrompt: null, imagePrompt: 'The tiny butterfly Flutter starting to smile hopefully, wings perking up slightly, warm comforting light surrounding the scene, magical forest backdrop with glowing flowers' },
        { text: 'Flutter brightened up. "My home is in the Rainbow Meadow, where flowers change colors!" But which way was the Rainbow Meadow?', brushingZone: 'bottom-right', brushingPrompt: 'Now brush your bottom right teeth while we think of a plan!', imagePrompt: 'A dreamy vision of Rainbow Meadow in the distance - a beautiful meadow with flowers that shimmer and change colors like a rainbow, butterflies dancing, magical and hopeful atmosphere' },
        { text: '[PET] had an idea! The Melody Blossoms might know the way. [PET] began to hum along with the flowers...', brushingZone: 'tongue', brushingPrompt: 'Don\'t forget your tongue - [PET] is counting on you!', imagePrompt: 'Melody Blossoms glowing brighter as they respond to humming, musical notes visible in the air, flowers swaying in harmony, magical connection between music and light' },
      ],
    },
    {
      chapterNumber: 3,
      title: 'The Grumpy Bridge Troll',
      recap: '[CHILD] and [PET] met a tiny lost butterfly named Flutter. She was blown far from her home in Rainbow Meadow, and [PET] used the Melody Blossoms to find the way!',
      cliffhanger: 'As they quietly crossed the bridge, Flutter gasped - she could see something sparkling in the distance!',
      nextChapterTeaser: 'Could it be Rainbow Meadow? Find out next time!',
      segments: [
        { text: 'Following the glowing flowers, [CHILD], [PET], and Flutter came to a small wooden bridge over a bubbling stream.', brushingZone: null, brushingPrompt: null, imagePrompt: 'A charming old wooden bridge arching over a crystal-clear bubbling stream, glowing flowers lining the path, magical forest setting, warm inviting but mysterious atmosphere' },
        { text: '"Stop right there!" grumbled a voice. A small, fuzzy troll popped up from under the bridge. He didn\'t look scary - just very tired and grumpy.', brushingZone: 'top-right', brushingPrompt: 'Brush your top right teeth while we talk to the troll!', imagePrompt: 'A small cute fuzzy troll with tired baggy eyes peeking out from under the wooden bridge, not scary but grumpy looking, soft fur, yawning, comedic and endearing character design' },
        { text: '"I can\'t sleep because someone keeps humming!" complained the troll. [CHILD] realized it must be the Melody Blossoms! They were being so loud.', brushingZone: null, brushingPrompt: null, imagePrompt: 'The fuzzy troll covering his ears with his small paws, Melody Blossoms humming loudly nearby with visible sound waves, the troll looking exhausted and frustrated but still cute' },
        { text: '[PET] had a wonderful idea. What if they sang the troll a lullaby instead? [CHILD] and [PET] began to hum a soft, sleepy tune.', brushingZone: 'bottom-left', brushingPrompt: 'Scrub your bottom left teeth - nice and gentle like the lullaby!', imagePrompt: 'Soft gentle musical notes floating through the air in soothing colors, the atmosphere becoming calm and dreamy, moonlight and starlight creating a peaceful lullaby scene' },
        { text: 'The grumpy troll yawned. His eyes got droopy. "That\'s... actually... very nice..." he mumbled, curling up for a cozy nap.', brushingZone: 'bottom-right', brushingPrompt: 'Now your bottom right teeth while the troll falls asleep!', imagePrompt: 'The fuzzy troll curled up in a cozy ball under the bridge, peacefully sleeping with a content smile, soft Zs floating above, warm gentle lighting, heartwarming scene' },
      ],
    },
    {
      chapterNumber: 4,
      title: 'Almost Home',
      recap: '[CHILD] and [PET] helped a grumpy troll fall asleep by singing him a lullaby. As they crossed his bridge, Flutter spotted something sparkling in the distance!',
      cliffhanger: 'They squeezed through the last gap in the hedge and stepped into the most beautiful meadow they had ever seen...',
      nextChapterTeaser: 'Will Flutter finally be home? Find out in the exciting finale!',
      segments: [
        { text: '"That\'s it! That\'s Rainbow Meadow!" cheered Flutter, pointing her tiny wing at the sparkling colors ahead.', brushingZone: null, brushingPrompt: null, imagePrompt: 'Flutter the butterfly excitedly pointing toward a distant sparkling meadow, rainbow colors visible on the horizon, hope and excitement in the scene, magical forest edge' },
        { text: 'They ran towards the beautiful meadow, but oh no! A tall hedge of thorny bushes blocked their path. It was too high to fly over for little Flutter.', brushingZone: 'top-left', brushingPrompt: 'Brush your top left teeth while we figure out what to do!', imagePrompt: 'A tall imposing hedge of thorny bushes blocking the path, Rainbow Meadow visible through small gaps, dramatic obstacle, the hedge looking like a wall of tangled vines and thorns' },
        { text: '[CHILD] looked carefully at the hedge. There were tiny gaps between the thorns, but they needed light to find a safe path through.', brushingZone: null, brushingPrompt: null, imagePrompt: 'Close-up of the thorny hedge showing small gaps and passages between the brambles, darkness within making it hard to see the path, mysterious and challenging' },
        { text: '[PET] had the best idea yet! [PET] remembered the Melody Blossoms. What if they could call the glowing flowers to help light the way?', brushingZone: 'top-right', brushingPrompt: 'Now brush your top right teeth while [PET] calls the flowers!', imagePrompt: 'Melody Blossoms floating through the air responding to a call, glowing flowers drifting toward the thorny hedge like little lanterns, magical and hopeful moment' },
        { text: '[PET] hummed the flowers\' special song. One by one, glowing blossoms floated over and lit up a safe path through the hedge!', brushingZone: 'tongue', brushingPrompt: 'Brush your tongue while we follow the magical path!', imagePrompt: 'A magical illuminated pathway through the thorny hedge, Melody Blossoms lining the safe route with their glow, light defeating darkness, triumphant and beautiful scene' },
      ],
    },
    {
      chapterNumber: 5,
      title: 'Home Sweet Home',
      recap: '[CHILD] and [PET] found Rainbow Meadow, but thorny bushes blocked the way! [PET] called the Melody Blossoms to light a safe path through.',
      cliffhanger: '',
      nextChapterTeaser: 'The End! Great job completing this adventure!',
      segments: [
        { text: 'Rainbow Meadow was even more magical than Flutter had described! Flowers of every color danced in the breeze, changing from pink to blue to gold.', brushingZone: null, brushingPrompt: null, imagePrompt: 'A breathtaking Rainbow Meadow filled with flowers that shimmer and change colors, petals transitioning from pink to blue to gold, butterflies everywhere, magical paradise landscape' },
        { text: '"Flutter! Flutter!" called dozens of tiny voices. A whole family of butterflies flew over, their wings sparkling with joy.', brushingZone: 'top-left', brushingPrompt: 'Brush your top left teeth during this happy reunion!', imagePrompt: 'A joyful swarm of colorful butterflies flying together in reunion, sparkling iridescent wings catching the light, emotional happy moment, Rainbow Meadow backdrop' },
        { text: 'Flutter\'s mother and father hugged her with their soft wings. "Thank you so much," they said to [CHILD] and [PET]. "You brought our Flutter home!"', brushingZone: 'top-right', brushingPrompt: 'Now your top right teeth while everyone celebrates!', imagePrompt: 'Butterfly family embrace - parent butterflies wrapping their wings around little Flutter in a loving hug, tears of joy, warm golden light, heartwarming reunion scene' },
        { text: 'The butterfly family gave [CHILD] and [PET] a special gift - a tiny jar of rainbow sparkles. "This will always help you find your way," said Flutter.', brushingZone: 'bottom-left', brushingPrompt: 'Brush your bottom left teeth - almost done!', imagePrompt: 'A magical tiny glass jar filled with swirling rainbow sparkles, glowing with inner light, precious gift, butterflies presenting it with gratitude, enchanting and special' },
        { text: '[CHILD] and [PET] waved goodbye and headed home, hearts full of happiness. They knew that whenever someone needed help, they\'d be ready for another adventure!', brushingZone: 'bottom-right', brushingPrompt: 'Finish with your bottom right teeth - great job!', imagePrompt: 'Sunset view of the magical forest path leading home, Rainbow Meadow in the background with butterflies waving goodbye, warm golden hour lighting, happy ending, sense of accomplishment' },
      ],
    },
  ],
};

// POST /api/admin - auth or migrate based on action
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, password } = req.body;

  // Auth action
  if (action === 'auth' || !action) {
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }
    if (password === ADMIN_PASSWORD) {
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Migrate action
  if (action === 'migrate') {
    const sql = getDb();
    try {
      const results = { worlds: 0, stories: 0, chapters: 0, segments: 0 };

      // Migrate worlds
      for (const world of worlds) {
        try {
          await sql`
            INSERT INTO worlds (name, display_name, description, theme, unlock_cost, is_starter, is_published)
            VALUES (${world.name}, ${world.displayName}, ${world.description}, ${world.theme}, ${world.unlockCost}, ${world.isStarter}, true)
            ON CONFLICT (name) DO NOTHING
          `;
          results.worlds++;
        } catch (err) {
          console.log(`World ${world.name} error:`, err);
        }
      }

      // Get magical-forest world ID and add the story
      const [magicalForest] = await sql`SELECT id FROM worlds WHERE name = 'magical-forest'`;

      if (magicalForest) {
        // Check if story already exists
        const [existingStory] = await sql`
          SELECT id FROM stories WHERE world_id = ${magicalForest.id} AND title = ${glowingFlowersStory.title}
        `;

        if (!existingStory) {
          // Create the story
          const [story] = await sql`
            INSERT INTO stories (world_id, title, description, total_chapters, status, is_published)
            VALUES (${magicalForest.id}, ${glowingFlowersStory.title}, ${glowingFlowersStory.description}, 5, 'published', true)
            RETURNING id
          `;
          results.stories++;

          // Create chapters and segments
          for (const chapter of glowingFlowersStory.chapters) {
            const [savedChapter] = await sql`
              INSERT INTO chapters (story_id, chapter_number, title, recap, cliffhanger, next_chapter_teaser)
              VALUES (${story.id}, ${chapter.chapterNumber}, ${chapter.title}, ${chapter.recap}, ${chapter.cliffhanger}, ${chapter.nextChapterTeaser})
              RETURNING id
            `;
            results.chapters++;

            for (let i = 0; i < chapter.segments.length; i++) {
              const segment = chapter.segments[i];
              await sql`
                INSERT INTO segments (chapter_id, segment_order, text, duration_seconds, brushing_zone, brushing_prompt, image_prompt)
                VALUES (${savedChapter.id}, ${i + 1}, ${segment.text}, 15, ${segment.brushingZone}, ${segment.brushingPrompt}, ${segment.imagePrompt})
              `;
              results.segments++;
            }
          }
        }
      }

      return res.status(200).json({ success: true, results });
    } catch (error) {
      return res.status(500).json({ error: 'Migration failed', details: String(error) });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
