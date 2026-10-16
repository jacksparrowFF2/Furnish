/* Compatibility entry; configuration and isolation are owned by the runner. */
require('./verify-browser.cjs').main(['kitchen-dish-basket']).catch(e=>{console.error(e);process.exitCode=1;});
