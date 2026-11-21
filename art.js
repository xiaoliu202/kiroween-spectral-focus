'use strict';
/* Original vector artwork, drawn for Spectral Focus. No external image assets. */
window.SpectralArt = (() => {
  const icons = {
    town: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    ghost: '<path d="M5 21V10a7 7 0 0 1 14 0v11l-4-2-3 2-3-2z"/><path d="M9 10v2m6-2v2"/>',
    candle: '<path d="M8 11h8v10H8zM12 11V8m0-6s-4 4 0 5c4-1 0-5 0-5zM5 22h14"/>',
    book: '<path d="M12 5v16M3 4c4-1 7 0 9 1 2-1 5-2 9-1v15c-4-1-7 0-9 2-2-2-5-3-9-2z"/>',
    candy: '<path d="m8 7 9 1-1 9-9-1zM8 7 4 3 3 8l4 1m10 6 4 1-1 5-4-4M9 10l5 5m-3-7 5 5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="m4 16-1 5 5-1L20 8l-4-4zM14 6l4 4"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    pause: '<path d="M8 4v16m8-16v16"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    sound: '<path d="m3 9 5 0 5-5v16l-5-5H3zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>'
  };
  function icon(name, cls = '') {
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
  }
  function ghost(cls = '') {
    return `<svg class="ghost-art ${cls}" viewBox="0 0 80 90" aria-hidden="true"><path d="M12 79V36a28 28 0 0 1 56 0v43L56 70 45 81 34 71 23 81 16 72Z" fill="currentColor"/><ellipse cx="31" cy="35" rx="4" ry="6" fill="#21182f"/><ellipse cx="50" cy="35" rx="4" ry="6" fill="#21182f"/><path d="M36 51q5 5 10 0" fill="none" stroke="#21182f" stroke-width="2" stroke-linecap="round"/><ellipse cx="23" cy="46" rx="5" ry="2.5" fill="#d998b1" opacity=".6"/><ellipse cx="56" cy="46" rx="5" ry="2.5" fill="#d998b1" opacity=".6"/></svg>`;
  }
  function lantern(id = 'harvest', cls = '') {
    const palette = {
      harvest: ['#e68028', '#bb4c18', '#ffe0a0', '#5b683c'],
      turnip: ['#d1c9b0', '#9c7199', '#ffe2a6', '#617441'],
      violet: ['#a77cbe', '#68488b', '#ffdf99', '#6a7750'],
      ember: ['#555067', '#30283e', '#ffb55d', '#82704b']
    }[id] || ['#e68028', '#bb4c18', '#ffe0a0', '#5b683c'];
    const turnip = id === 'turnip';
    // Eyes and mouth are separate so the Folklore Cabinet can make the lantern chomp a candy.
    // The open maw and the candy start transparent, so every other placement looks unchanged.
    return `<svg class="lantern-art ${cls}" viewBox="0 0 140 130" aria-hidden="true"><ellipse class="lantern-shadow" cx="70" cy="117" rx="52" ry="7" fill="#080612" opacity=".5"/><g class="lantern-body"><path d="M67 28q-7-16 9-23l8 7q-14 3-10 18" fill="${palette[3]}" stroke="#23221d" stroke-width="3"/><path d="${turnip ? 'M69 26C18 21 13 56 29 84l38 32q5 6 10 0l39-36c16-32-3-62-47-54Z' : 'M69 28C24 8-1 49 16 86c9 25 28 30 54 23 28 8 51-4 58-30 10-39-17-67-59-51Z'}" fill="${palette[0]}" stroke="${palette[1]}" stroke-width="5"/><path d="M53 30C30 45 35 91 54 107M85 29c20 17 18 60 0 79M70 29v80" fill="none" stroke="${palette[1]}" stroke-width="3" opacity=".6"/><path class="lantern-face lantern-eyes" d="m34 64 20-12 4 19Zm48 7 4-19 20 12Z" fill="${palette[2]}"/><path class="lantern-face lantern-mouth" d="M39 83l16 7 6-6 8 9 10-8 7 5 17-7-13 18H53Z" fill="${palette[2]}"/><g class="lantern-maw" opacity="0"><path d="M34 78q36-9 72 0-6 31-36 32-30-1-36-32Z" fill="#2a0f0b" stroke="${palette[2]}" stroke-width="3"/><path d="m44 80 5 9 5-10m24 0 5 10 5-9M58 108l4-8 4 9m10 0 4-9 4 8" fill="${palette[2]}"/><ellipse cx="70" cy="97" rx="15" ry="6" fill="#ff9d4d" opacity=".55"/></g></g><g class="lantern-candy" opacity="0"><path d="m55 22 8 4-8 4zm30 0-8 4 8 4z" fill="#f3b5c8"/><rect x="62" y="20" width="16" height="12" rx="6" fill="#f7d36b" stroke="#a8572b" stroke-width="1.5"/><path d="M66 21v10m4-10v10m4-10v10" stroke="#e46f4f" stroke-width="1.6"/></g></svg>`;
  }
  function town() {
    return `<svg class="town-art" viewBox="0 0 1100 390" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#29203e"/><stop offset="1" stop-color="#5e3543"/></linearGradient>
        <linearGradient id="hill" x2="0" y2="1"><stop stop-color="#352638"/><stop offset="1" stop-color="#171321"/></linearGradient>
        <radialGradient id="moonglow"><stop stop-color="#f4d3a7" stop-opacity=".23"/><stop offset="1" stop-color="#f4d3a7" stop-opacity="0"/></radialGradient>
        <linearGradient id="path" x2="0" y2="1"><stop stop-color="#a16b53" stop-opacity=".7"/><stop offset="1" stop-color="#6b4250" stop-opacity=".1"/></linearGradient>
        <pattern id="shingles" width="18" height="12" patternUnits="userSpaceOnUse"><path d="M0 11h18M9 0v11" stroke="#c67c57" stroke-opacity=".12" fill="none"/></pattern>
      </defs>
      <path fill="url(#sky)" d="M0 0h1100v390H0z"/>
      <circle class="town-moonglow" cx="872" cy="100" r="157" fill="url(#moonglow)"/><circle cx="872" cy="100" r="54" fill="#efcfaa"/>
      <g fill="#c9aa94" opacity=".36"><circle cx="854" cy="80" r="10"/><circle cx="889" cy="122" r="15"/><circle cx="896" cy="75" r="5"/></g>
      <g fill="#d4bbad" opacity=".65"><circle cx="125" cy="62" r="1.5"/><circle cx="316" cy="32" r="1.5"/><circle cx="450" cy="65" r="1"/><circle cx="649" cy="29" r="1.5"/><circle cx="739" cy="99" r="1.5"/><circle cx="1035" cy="55" r="1.5"/><circle cx="195" cy="100" r="1"/><path d="m583 64 2-5 2 5 5 2-5 2-2 5-2-5-5-2z"/></g>
      <g fill="#1b1829"><g class="town-bat bat-one"><g class="bat-flap"><path d="M750 71q9-11 17 0l4-9 5 9q8-10 19-1l-17 7-5 8-5-8z"/></g></g><g class="town-bat bat-two"><g class="bat-flap"><path d="M965 150q7-9 14 0l3-7 4 7q7-8 14 0l-13 5-4 6-4-6z"/></g></g><g class="town-bat bat-three"><g class="bat-flap"><path d="M710 106q5-7 10 0l2-5 3 5q5-6 11 0l-10 4-3 4-3-4z"/></g></g></g>
      <path d="M0 259q150-85 283-18t256-13q139-59 284 12 139-68 277 4v146H0Z" fill="#35283e"/>
      <path d="M0 308q200-69 362-14t320-4q191-47 418 8v92H0Z" fill="url(#hill)"/>
      <path d="M540 265q-25 38 17 55t-25 70h257q-62-47-153-57-92-13-35-68z" fill="url(#path)"/>
      <!-- Bare trees are silhouettes, not borrowed illustrations. -->
      <g stroke="#211a2a" fill="none" stroke-linecap="round"><path d="M73 330 89 103m-7 86-31-39-4-40m7 44-32-12m58 77 48-45 12-46m-13 47 32-6M88 127l25-36m-31 155-47-35m1002 129-16-186m-3 30-38-34-6-33m44 87 45-51 3-36m-45 106-43-18m50-69 25-39" stroke-width="8"/><path d="m66 169-38-50m76 77 3-40m910 4-18-47" stroke-width="4"/></g>
      <!-- Left cottage: task board -->
      <g class="task-cottage"><path d="m174 207 84-75 82 75-4 95H180Z" fill="#503541" stroke="#1a1526" stroke-width="5"/><path d="M162 209 257 116l100 94-18 9-83-76-79 76Z" fill="#2c2435" stroke="#1a1526" stroke-width="5"/><path d="m181 193 76-72 80 75" fill="url(#shingles)"/><path d="M291 143v-36h20v54" fill="#3c2936" stroke="#1a1526" stroke-width="4"/><path d="M230 302v-58q23-20 45 0v58" fill="#241d2c" stroke="#b77951" stroke-width="3"/><g class="cottage-window" fill="#dda264" stroke="#261d2e" stroke-width="4"><path d="M192 224h25v34h-25zM291 224h25v34h-25z"/><circle cx="256" cy="180" r="16"/></g><path d="M256 164v32m-16-16h32" stroke="#352536" stroke-width="4"/><path d="M186 304h145" stroke="#986c53" stroke-width="4"/></g>
      <g class="chimney-smoke" fill="#bfb0c8"><circle cx="301" cy="100" r="6"/><circle cx="301" cy="100" r="6"/><circle cx="301" cy="100" r="6"/></g>
      <!-- Tall candle house -->
      <g class="focus-cottage"><path d="M467 277V147l59-68 58 68v130Z" fill="#483445" stroke="#1b1727" stroke-width="5"/><path d="m453 151 74-90 73 91-16 5-58-68-59 70Z" fill="#231e30" stroke="#191524" stroke-width="5"/><path d="M512 83V44h24v39" fill="#35283e"/><path d="M514 277v-57q12-12 24 0v57" fill="#231b2a"/><g class="cottage-window" fill="#efb771" stroke="#2b2031" stroke-width="4"><path d="M487 164h24v30h-24zM541 164h24v30h-24z"/><path d="M514 124q12-21 24 0v19h-24z"/></g><path d="M488 166v27m65-27v27" stroke="#65404a" stroke-width="3"/><path d="M461 278h130" stroke="#9b6a52" stroke-width="4"/><path d="m522 40 6-12 6 12" fill="#d7a26c"/></g>
      <!-- Folklore bookshop -->
      <g><path d="M690 224h128v75H690z" fill="#503f4b" stroke="#211927" stroke-width="5"/><path d="m674 224 80-68 80 68Z" fill="#2b2434" stroke="#1c1727" stroke-width="5"/><path d="m688 214 67-55 66 55Z" fill="url(#shingles)"/><path d="M742 299v-51h26v51" fill="#231b2b" stroke="#a47457" stroke-width="3"/><g class="cottage-window" fill="#e3ac72" stroke="#302236" stroke-width="4"><path d="M702 247h25v28h-25zM783 247h24v28h-24z"/><path d="m746 202 9-16 9 16v15h-18z"/></g><path d="M686 301h140" stroke="#97715d" stroke-width="4"/></g>
      <g fill="#987c82" stroke="#2c2435" stroke-width="3"><path d="M941 298v-20a11 11 0 0 1 22 0v20zM974 303v-14a9 9 0 0 1 18 0v14z"/><path d="M934 299h36m-1 6h28"/></g>
      <g fill="#cb702c" stroke="#743f2d" stroke-width="2"><ellipse cx="162" cy="310" rx="17" ry="13"/><ellipse cx="187" cy="315" rx="12" ry="10"/><ellipse cx="828" cy="307" rx="17" ry="14"/><ellipse cx="854" cy="312" rx="12" ry="10"/></g><g stroke="#60704a" stroke-width="4"><path d="m161 297 3-7m24 15-1-6m642-5-2-8m27 16 2-6"/></g>
      <g class="pumpkin-face" fill="#ffd27a"><path d="m154 306 4-5 3 5zm10 0 3-5 4 5zm-9 6q7 5 14 0l-3 3h-8z"/><path d="m820 303 4-5 3 5zm10 0 3-5 4 5zm-9 6q7 5 14 0l-3 3h-8z"/></g>
      <g class="town-spirit"><path d="M365 257v-22a17 17 0 0 1 34 0v22l-9-6-8 7-8-6z" fill="#c6bed0" opacity=".85"/><path d="M376 235v4m12-4v4" stroke="#302537" stroke-width="3" stroke-linecap="round"/></g>
      <g class="town-wanderer"><g class="town-wanderer-bob"><path d="M600 236v-19a14 14 0 0 1 28 0v19l-7-5-7 6-7-6z" fill="#d9cfe2" opacity=".8"/><path d="M609 217v3m10-3v3" stroke="#302537" stroke-width="3" stroke-linecap="round"/></g></g>
      <g class="town-settled" opacity="0"><path d="M912 240v-20a14 14 0 0 1 28 0v20l-7-5-7 6-7-6z" fill="#d2bdbe"/><path d="M921 220v3m11-3v3" stroke="#302537" stroke-width="3"/></g>
      <g fill="#ac7250" opacity=".65"><path d="m323 345 8-8 7 9-8 4zm382 12 7-9 12 4-4 8zM122 362l7-7 9 6-8 5zM902 348l8-6 10 9-12 3z"/></g>
      <path d="M0 369q160-24 319-1t290-6q227-26 491 3v25H0Z" fill="#17131f"/>
    </svg>`;
  }
  function bat(cls = '') {
    return `<svg class="bat-art ${cls}" viewBox="0 0 64 30" aria-hidden="true"><g class="bat-wings" fill="currentColor"><path d="M32 11c-2-4-5-6-8-6 1 2 1 4 0 5-5-4-13-5-22 0 6 1 10 5 12 11 3-3 8-4 12-1 1-3 3-5 6-5s5 2 6 5c4-3 9-2 12 1 2-6 6-10 12-11-9-5-17-4-22 0-1-1-1-3 0-5-3 0-6 2-8 6z"/></g><circle cx="29" cy="12" r="1.2" fill="#ffc985"/><circle cx="35" cy="12" r="1.2" fill="#ffc985"/></svg>`;
  }
  return {icon, ghost, lantern, town, bat};
})();
