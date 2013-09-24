var TRANSLATION_INPUT, TRANSLATION_OUTPUT;

// This script runs in the page context so preferences have to be set from the 
// main.js 

var UPDATE_CALLBACK_ATTACHED = false;

self.port.on('setprefs', function(inbox, outbox){
    TRANSLATION_INPUT = inbox;
    TRANSLATION_OUTPUT = outbox;
    if( $(TRANSLATION_OUTPUT).length > 0){
	// show the translation when the output text is update
	addMutationObserver(TRANSLATION_OUTPUT, showtrans)
	UPDATE_CALLBACK_ATTACHED = true;
    }else{
	UPDATE_CALLBACK_ATTACHED = false;
    }
})

var observer = null;

// JQuery on() didn't work but here's a work-around.
// see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

// configuration of the observer:
var config = { attributes: true, childList: false, characterData: false};

function addMutationObserver(element, fun){
    if (observer != null){
	console.log("observer was already added for " + element);
	return;
    }
    // create an observer instance
    observer = new MutationObserver(function(mutations) {
	fun();
    });
    connectMO(element);
}

function connectMO(element){
    var target = document.querySelector(element);
    // pass in the target node, as well as the observer options
    observer.observe(target, config);
}

function disconnectMO(){
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
    if( $(TRANSLATION_INPUT).length > 0){
	if(!UPDATE_CALLBACK_ATTACHED){
	    addMutationObserver(TRANSLATION_OUTPUT, showtrans)
	    UPDATE_CALLBACK_ATTACHED = true;
	}
	$(TRANSLATION_INPUT).val(source_text);
    }else{
	// sometimes the external translation page does not load on time. 
	// Simply reloading the translator works around the timing issues .
	UPDATE_CALLBACK_ATTACHED = false;
	self.port.emit('translatorReload', source_text);
    }
});

function showtrans(){
    var orig = $(TRANSLATION_INPUT).val();
    var trans =  $(TRANSLATION_OUTPUT).map(function() { 
	return $.text([this]); 
    }).get();
    self.port.emit('update_selection', orig, trans);
}

// Grab the translation 
self.port.on('showtrans', function(){
    showtrans();
});

