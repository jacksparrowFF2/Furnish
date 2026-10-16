/* Compatibility command; implementation lives in scripts/verify. */
require('./verify-browser.cjs').main(['dxf-supplement']).catch(e=>{console.error(e);process.exitCode=1;});
