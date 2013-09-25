var TRANSLATION_INPUT, TRANSLATION_OUTPUT;

// This script runs in the page context so preferences have to be set from the 
// main.js 

var UPDATE_CALLBACK_ATTACHED = false;

self.port.on('setprefs', function(inbox, outbox){
    TRANSLATION_INPUT = inbox;
    TRANSLATION_OUTPUT = outbox;
    on_update_register();
})


// Sometimes the page isn't loaded or the an incorrect element was specified.
// This is a simple check using JQuery
function element_found(element){
    return $(element).length > 0
}

// configuration of the observer:
var config = { attributes: true, childList: false, characterData: false};
var observer;

/* 
   JQuery on() didn't work but here's a work-around. MutationObserver is a DOM 4 
   construct to replace the deprecated bind events.
   see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

   It seems to work pretty well but it could have an impact on performance if
   the observer is not disconnected.
 */
function on_update_register(){
    if(element_found(TRANSLATION_OUTPUT)){
	// could we have an observer from another translation page - probably not.
	if (observer != null ){ 
	    console.log("observer was already added.");
	    return;
	}
	// create an observer instance
	observer = new MutationObserver(function(mutations) {
	    showtrans();
	});
	// show the translation when the output text is updated
    }else{
	console.log("on_update_register failed UPDATE_CALLBACK_ATTACHED as element not available - " + TRANSLATION_OUTPUT ); 
    }
    return observer;
}

function on_update_start(){
    if(!observer){
	if(!TRANSLATION_OUTPUT){
	    self.port.emit("reset_scraper");
	    return;
	}else{
	    on_update_register();
	}
    }
    if(element_found(TRANSLATION_OUTPUT)){
	if(observer.target != TRANSLATION_OUTPUT){
	    // stop observing a previous translator
	    if(observer){
		on_update_stop();
	    }
	    var target = document.querySelector(TRANSLATION_OUTPUT);
	    // pass in the target node, as well as the observer options
	    observer.observe(target, config);
	}else{
	    console.log("on_update_start translator observer already registered!");
	}
    }else{
	console.log("on_update_start translator not loaded!");
    }
}

function on_update_stop(){
    // should cover undefine too?
    if(!observer){
	console.log("on_update_stop observer is null");
	return;
    }
    // empties the instance's record queue and returns what was in there.
    var records = observer.takeRecords();
    observer.disconnect();    
}

/**
   Callbacks from the translation page are handled here so the results 
   can be displayed inline and stored.
 */

// update the source of the translation in google translate panel
// and the translation appears automatically in the result_box.
self.port.on('translate', function(source_text){
    if( element_found(TRANSLATION_INPUT)){
	if(!UPDATE_CALLBACK_ATTACHED){
	    on_update_start();
	    UPDATE_CALLBACK_ATTACHED = true;
	}
	$(TRANSLATION_INPUT).val(source_text);
    }else{
	// sometimes the external translation page does not load on time. 
	// Simply reloading the translator works around the timing issues .
	UPDATE_CALLBACK_ATTACHED = false;
	self.port.emit('translator_reload', source_text);
    }
});

/*  send the translation back to the add-on scope for display */
function showtrans(){
    var orig = $(TRANSLATION_INPUT).val();
    var trans =  $(TRANSLATION_OUTPUT).map(function() { 
	return $.text([this]); 
    }).get();
    self.port.emit('update_selection', orig, trans);
}

/* Grab the translation from the output element */
self.port.on('showtrans', function(){
    showtrans();
});

self.port.on('stop_translation_updates', function(){
    on_update_stop();
});

self.port.on('start_translation_updates', function(){
    on_update_start();
});


$("document").ready(function () {
});