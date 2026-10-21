// Everyday stories encoded as deterministic tape programs, not hardcoded animations.
(function(root) {
  'use strict';
  const B = '□';
  const r = (state,read,write,move,next,note) => ({state,read,write,move,next,note});
  const symbol = (icon,label) => ({icon,label});
  const recipes = [
    {
      id:'pancakes',name:'Pancake kitchen',subtitle:'A tray of batter. A breakfast to make.',icon:'🥞',
      description:'Cook the first side as the head moves right. At the empty cell, turn around and flip each pancake on the way back.',
      input:'DDD',alphabet:'D = a portion of batter',start:'cook',accept:['serve'],reject:[],
      states:['cook','flip','serve'],labels:{cook:'Cook first sides',flip:'Flip & finish',serve:'Breakfast is ready'},
      symbols:{D:symbol('🥣','Batter'),G:symbol('🍳','One side cooked'),P:symbol('🥞','Ready pancake'),[B]:symbol('·','Empty cell')},
      palette:['D'],goal:'Batter → pancakes',unit:'tray',
      examples:[{input:'DDD',label:'Breakfast for three'},{input:'D',label:'Just one pancake'},{input:'DDDDD',label:'Family breakfast'}],
      validate:s=>/^D+$/.test(s)?'':'Add at least one portion of batter (D). Use only D for this recipe.',
      rules:[
        r('cook','D','G','R','cook','Cook the first side of this portion. Replace Batter with One side cooked, then move to the next cell.'),
        r('cook',B,B,'L','flip','The empty cell marks the end of the batch. Turn left and switch to flipping.'),
        r('flip','G','P','L','flip','Flip this pancake and finish its second side. Mark it Ready, then move left to the previous pancake.'),
        r('flip',B,B,'R','serve','The head has returned past the first pancake. Every pancake is ready: halt and serve breakfast.')
      ],
      result:(_,out)=>`${out.length === 1 ? 'Your pancake is' : `All ${out.length} pancakes are`} ready. Breakfast is served!`,
      success:'Breakfast is served!',
      insight:'The tape remembers which side is cooked. The state remembers whether the chef is cooking first sides or flipping. Moving left really revisits earlier cells.',
      scene:{cook:'🍳',flip:'🥄',serve:'🥞'}
    },
    {
      id:'tea',name:'Tea maker',subtitle:'A good cup starts with the right order.',icon:'🫖',
      description:'Read a tea order from left to right: water, tea, then optional milk. A step out of order stops the machine with an explanation.',
      input:'WTM',alphabet:'W = water · T = tea · M = milk',start:'water',accept:['serve'],reject:['stop'],
      states:['water','steep','finish','check','serve','stop'],
      labels:{water:'Start with water',steep:'Steep the tea',finish:'Milk or finish',check:'Check the end',serve:'Tea is ready',stop:'Check your order'},
      symbols:{W:symbol('💧','Water'),T:symbol('🍃','Tea'),M:symbol('🥛','Milk'),H:symbol('♨️','Water heated'),C:symbol('🍵','Tea steeped'),A:symbol('☕','Milk added'),[B]:symbol('·','Empty cell')},
      palette:['W','T','M'],goal:'Water → tea → milk',unit:'order',
      examples:[{input:'WTM',label:'Tea with milk'},{input:'WT',label:'Plain tea'},{input:'TWM',label:'Wrong order'},{input:'W',label:'Forgot the tea'}],
      validate:s=>/^[WTM]*$/.test(s)?'':'Use Water (W), Tea (T), and Milk (M). The machine will check their order.',
      rules:[
        r('water','W','H','R','steep','Heat the water. Replace Water with Water heated, then move right to look for tea.'),
        ...['T','M',B].map(s=>r('water',s,s,'R','stop','This recipe needs water first. Halt: load an order beginning with Water.')),
        r('steep','T','C','R','finish','Steep the tea in the water. Mark Tea steeped, then look for optional milk or the end.'),
        ...['W','M',B].map(s=>r('steep',s,s,'R','stop','Tea must follow the water. Halt: the next ingredient is wrong or the tea is missing.')),
        r('finish','M','A','R','check','Add milk to the brewed tea. Mark Milk added, then check that the order ends here.'),
        r('finish',B,B,'R','serve','No milk was requested. The plain tea is ready; halt and serve.'),
        ...['W','T'].map(s=>r('finish',s,s,'R','stop','After steeping, this recipe allows milk or the end of the order. Halt: an unexpected ingredient remains.')),
        r('check',B,B,'R','serve','The order is complete. Halt and serve the tea with milk.'),
        ...['W','T','M'].map(s=>r('check',s,s,'R','stop','The cup is already finished. Halt: extra ingredients remain after the milk.'))
      ],
      result:input=>input.includes('M')?'Your tea with milk is ready. Enjoy your cup!':'Your plain tea is ready. Enjoy your cup!',
      success:'Your tea is ready!',failure:'This order needs a fix.',
      insight:'Each state remembers which ingredient must come next. Incorrect order is a real rejecting halt selected by a rule, not a separate recipe checker.',
      scene:{water:'💧',steep:'🫖',finish:'🍵',check:'☕',serve:'☕',stop:'📝'}
    },
    {
      id:'sandwich',name:'Sandwich station',subtitle:'Build it. Fill it. Put a lid on it.',icon:'🥪',
      description:'Start with bread, add one or more fillings, and finish with bread. The head checks and marks each ingredient as it assembles your sandwich.',
      input:'BLCB',alphabet:'B = bread · L = lettuce · C = cheese',start:'base',accept:['serve'],reject:['stop'],
      states:['base','fill','more','check','serve','stop'],
      labels:{base:'Lay the bread',fill:'Add a filling',more:'Fill or close',check:'Check the end',serve:'Lunch is ready',stop:'Check your sandwich'},
      symbols:{B:symbol('🍞','Bread'),L:symbol('🥬','Lettuce'),C:symbol('🧀','Cheese'),b:symbol('🍽️','Base placed'),l:symbol('🥬','Lettuce added'),c:symbol('🧀','Cheese added'),S:symbol('🥪','Top placed'),[B]:symbol('·','Empty cell')},
      palette:['B','L','C'],goal:'Bread → fillings → bread',unit:'order',
      examples:[{input:'BLCB',label:'Cheese & lettuce'},{input:'BCB',label:'Cheese sandwich'},{input:'BCLCB',label:'Extra fillings'},{input:'BLC',label:'Missing top slice'}],
      validate:s=>/^[BLC]*$/.test(s)?'':'Use Bread (B), Lettuce (L), and Cheese (C). The machine will check the recipe.',
      rules:[
        r('base','B','b','R','fill','Place the bottom slice of bread. Mark Base placed, then move right to find a filling.'),
        ...['L','C',B].map(s=>r('base',s,s,'R','stop','A sandwich needs a bottom slice of bread. Halt: start the order with Bread.')),
        ...['L','C'].map(s=>r('fill',s,s.toLowerCase(),'R','more',`Add the ${s==='L'?'lettuce':'cheese'} to the bread and mark it added. Move right to continue.`)),
        ...['B',B].map(s=>r('fill',s,s,'R','stop','This recipe needs at least one filling between its slices. Halt: add Lettuce or Cheese.')),
        ...['L','C'].map(s=>r('more',s,s.toLowerCase(),'R','more',`Add another layer of ${s==='L'?'lettuce':'cheese'}. Mark it added and move right.`)),
        r('more','B','S','R','check','Place the top slice. Mark Top placed, then move right to check the end of the order.'),
        r('more',B,B,'R','stop','The order ended before the top slice. Halt: add Bread at the end to close the sandwich.'),
        r('check',B,B,'R','serve','The sandwich is closed and there are no leftover ingredients. Halt and serve lunch.'),
        ...['B','L','C'].map(s=>r('check',s,s,'R','stop','The sandwich is already closed. Halt: remove the extra ingredients after the top slice.'))
      ],
      result:()=> 'Your sandwich is assembled, with every filling between the bread slices.',success:'Lunch is served!',failure:'This sandwich needs a fix.',
      insight:'The rules accept exactly bread, one or more fillings, then bread. Each added ingredient leaves a mark on the tape, so you can rewind and inspect the assembly.',
      scene:{base:'🍞',fill:'🧀',more:'🥬',check:'🥪',serve:'🥪',stop:'📝'}
    }
  ];
  if(typeof module!=='undefined'&&module.exports)module.exports=recipes;else root.TuringRecipes=recipes;
})(typeof globalThis!=='undefined'?globalThis:this);
