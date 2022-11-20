const SOURCE = 'https://raw.githubusercontent.com/gerarts/scriptable-scripts/main/energy-prices.js';

// Script loader  
async function run() { 
  eval(await new Request(SOURCE).loadString());
}

// Show error card
function error(e) {
  // Create error presenter
  const err = new ListWidget();
  err.backgroundColor = new Color('#331111');
  
  // Set error message
  err.addText('Failed to load...').textColor = new Color('#ff8888');
  err.addText(new Date().toLocaleString()).textColor = new Color('#ffffff44');
  err.addText('');
  const details = err.addText(String(e));
  details.textColor = new Color('#ffffff44');
  details.font = Font.lightRoundedSystemFont(14);

  // Render widget
  if (config.runsInWidget) {
    Script.setWidget(err);
  } else {
    err.presentMedium();
  }
  
  // Exit
  Script.complete();
}

// Run
run().catch(error);
