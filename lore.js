'use strict';
/* Original concise summaries. Sources are cited, never embedded or scraped at runtime. */
window.SpectralLore = (() => {
  const sources = {
    origins: {
      institution: 'Library of Congress · American Folklife Center',
      title: 'Welcome to Folklife Today, and…Happy Halloween! (2013)',
      url: 'https://blogs.loc.gov/folklife/2013/10/welcome-to-folklife-today/'
    },
    lanterns: {
      institution: 'Library of Congress · American Folklife Center',
      title: 'Spooky Stories for Halloween 2022 on the Folklife Today Podcast',
      url: 'https://blogs.loc.gov/folklife/2022/10/spooky-stories-for-halloween-2022-on-the-folklife-today-podcast/'
    },
    stories: {
      institution: 'Library of Congress · American Folklife Center',
      title: 'Scary Stories for Halloween 2024 on the Folklife Today Podcast',
      url: 'https://blogs.loc.gov/folklife/2024/10/scary-stories-for-halloween-2024-on-the-folklife-today-podcast/'
    },
    history: {
      institution: 'HISTORY · Editorial overview',
      title: 'Halloween: Origins, Movies & Traditions',
      url: 'https://www.history.com/articles/history-of-halloween'
    },
    exhibition: {
      institution: 'Library of Congress · American Folklife Center',
      title: 'LOC Halloween: Enter the Chambers of Mystery! (2017)',
      url: 'https://blogs.loc.gov/folklife/2017/10/loc-halloween-enter-the-chambers-of-mystery/'
    }
  };
  const cards = [
    {
      id: 'lanterns', title: 'A light before the pumpkin', region: 'Britain, Ireland & North America', art: 'turnip',
      teaser: 'A carved turnip, a wandering Jack, and a very familiar autumn glow.',
      body: [
        'The glowing pumpkin has older relatives. Jack Santino’s account at the Library of Congress describes lanterns carved from turnips and other roots in Britain, alongside pumpkin carving in America.',
        'One folktale gives the wandering Jack an ember to light his way. There are many versions, not one definitive origin story. A carved lantern is a real custom; Jack’s adventures are folklore.',
        'Our turnip lantern nods to that wider family of lights. Its collectible design and candy price are inventions for this little town.'
      ], sources: [sources.lanterns]
    },
    {
      id: 'samhain', title: 'At the turning of the season', region: 'Ireland · seasonal traditions', art: 'moon',
      teaser: 'Longer nights, a changing season, and a history with more than one layer.',
      body: [
        'Irish Samhain is an important part of Halloween’s history, associated with the transition into the darker part of the year. Halloween also developed through later religious and community traditions.',
        'Was Samhain the Celtic New Year? The American Folklife Center cautions that this widely repeated idea is disputed. The evidence does not give us a simple, certain ancient calendar.',
        'This town borrows the feeling of a seasonal threshold. Its focus spells are a playful metaphor, not a reconstruction of an ancient rite.'
      ], sources: [sources.origins]
    },
    {
      id: 'hallows', title: 'The evening in the name', region: 'Christian calendar · varied observances', art: 'candle',
      teaser: 'Halloween sits beside other autumn observances, but they are not interchangeable.',
      body: [
        'All Hallows’ Eve is the evening before All Saints’ Day on November 1. All Souls’ Day follows on November 2. These days have different meanings and practices across communities.',
        'The Library of Congress discusses these observances together while noting regional differences. Its exhibitions distinguish Halloween festivities from Día de Muertos traditions, including Mexican remembrance altars.',
        'Here a candle simply helps you see your remaining focus time. We do not present task completion as an act of worship or the releasing of an actual soul.'
      ], sources: [sources.origins, sources.exhibition]
    },
    {
      id: 'guising', title: 'A different face at the door', region: 'Costume & neighbourhood customs', art: 'candy',
      teaser: 'Disguises, decorated doorsteps and a shared invitation to play.',
      body: [
        'Costume visits and Halloween treats belong to a changing family of customs. In modern trick-or-treating, children dress up and visit neighbours, while houses become small seasonal stages.',
        'The Folklife Center documents those visits, yard decorations, parties and parades. Rather than a single unbroken ritual, Halloween offers many local ways to gather and play.',
        'Our friendly ghosts and task treats turn that community imagery into a private productivity game. Reopening the same task does not earn another treat.'
      ], sources: [sources.origins]
    },
    {
      id: 'ghosts', title: 'Pull up a chair. Tell a tale.', region: 'United States · oral storytelling', art: 'ghost',
      teaser: 'Ghost stories travel through voices, places and wonderfully different versions.',
      body: [
        'The American Folklife Center’s Halloween recordings preserve stories told by named performers, from ghost legends to witch tales. The 2024 selection includes The Vanishing Hitchhiker, Skin, Don’t You Know Me? and The Two White Horses.',
        'A storyteller’s version carries a particular voice and setting. A tale is not evidence that its supernatural events occurred; even the explanations attached to stories can become folklore.',
        'Follow the source to hear those voices in context. Our floating residents are original drawings, not representations of a particular community’s spirits.'
      ], sources: [sources.stories]
    },
    {
      id: 'harvest', title: 'Apples, games & autumn tables', region: 'Seasonal gatherings · Britain & America', art: 'harvest',
      teaser: 'There is more to an autumn gathering than a bowl of candy.',
      body: [
        'Seasonal foods and party games are another thread in Halloween’s changing story. Apples, nuts and pumpkins have appeared in autumn gatherings; apple bobbing is a familiar example of a game connected with the season.',
        'HISTORY’s overview describes how food, games and costumes featured in community celebrations. Practices differ by time and place, so no single menu stands for everyone’s Halloween.',
        'Our candy economy and lantern collection are contemporary inventions. Enjoy them as small celebrations of progress, not as claims about ancient rewards.'
      ], sources: [sources.history]
    }
  ];
  return {cards, sources};
})();
