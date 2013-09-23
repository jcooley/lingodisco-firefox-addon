var self = require("self");
var data = self.data;
var selection = require("selection");
var simpleStorage = require("sdk/simple-storage");
var timers = require("timers");
var notify = require("notifications").notify;
var sp = require("sdk/simple-prefs");
var prefs = sp.prefs;

var _ = require("sdk/l10n").get;

var translation_on = false;
var RESET_WORKING = true;

var workers = [];
function detachWorker(worker, workerArray) {
  var index = workerArray.indexOf(worker);
  if(index != -1) {
    workerArray.splice(index, 1);
  }
};

// Create the persistent notes array if it doesn't already exist.  
simpleStorage.storage.gloss = simpleStorage.storage.gloss || [];

simpleStorage.on("OverQuota", function () {
  while (ss.quotaUsage > 1)
      ss.storage.gloss.reverse().pop();
});

var control_panel = require("panel").Panel({
    contentURL: self.data.url("control_panel.html"),
    contentScriptFile: [data.url("jquery-1.7.2.js"), 
			data.url('onoffpanel.js')
		       ]
});

let translateWidget =  require("widget").Widget({
    id: 'ocuile-aistrigh',
    label: "Translate",
    contentURL: data.url("disco-dark.png"),
    // have to specify this or it gets lost for bigger values
    panel: control_panel,
    onAttach: function(worker) {
	workers.push(worker);
	worker.on('detach', function () {
	    detachWorker(this, workers);
	});
    }
});

			      

let translation_scraper_panel = require("panel").Panel({
    width: 800,
    height: 600,
    contentURL: prefs.translation_url,
    contentScriptFile: [data.url("jquery-1.7.2.js"),
			data.url("scraper.js")],
    contentScriptWhen: "end"
});



function resetScraper(){
    translation_scraper_panel.contentURL = prefs.translation_url;
    translation_scraper_panel.port.emit("setprefs", prefs.translation_input, prefs.translation_output);
    RESET_WORKING = false;
}


function init(){
    // the scraper script can't access these values from the page scope so we initialize them here
    translation_scraper_panel.port.emit("setprefs", prefs.translation_input, prefs.translation_output);
    control_panel.port.emit("localize_enable_disable", _("toggle_enable_id"), _("toggle_disable_id"), _("on"), _("off"));
}

init();

function showtrans(){
    translation_scraper_panel.port.emit('showtrans');
};

function show_last_translations(total){
    // show the last 5 translations in the #translated div of the panel
    if (simpleStorage.storage.gloss.length > 0){
	control_panel.port.emit('translated', simpleStorage.storage.gloss.slice(-total).reverse().join("<br />"));
    }else{
	control_panel.port.emit('translated', "<br /><em>"+ _("nothing_translated_id") +"</em>");
    }
}

selection.on('select', function() {
    if (translation_on){
	// sanity check to take care for unwanted over selections
	if ((selection.text != selection.html) && (selection.text.length > prefs.translation_cutoff)){
	    notify({
		text: "There may a problem with the selection. Please try a shorter selection to try again",
	    });
	    return;
	};
	// repeating this is necessary for callbacks to have time to register
	translation_scraper_panel.contentURL = prefs.translation_url;
	translation_scraper_panel.port.emit('translate', selection.text);
    }
});

translation_scraper_panel.port.on("translatorReload", function(text_to_translate) {
    resetScraper();
    // retry the translation
    translation_scraper_panel.port.emit('translate', text_to_translate);
});

var ROW_START = "<tr><td>";

translation_scraper_panel.port.on('update_selection', function(source, translation){
    RESET_WORKING = true;    
    if (selection.text){
	var gloss = simpleStorage.storage.gloss;
	var lastEntry = gloss.pop() || '';
	// as the translation is update on a word-by-word basis we need to check if we have added
	// a partial translation alreay
	if (lastEntry && !lastEntry.startsWith(ROW_START+source)){
	    gloss.push(lastEntry);
	}
	gloss.push(ROW_START+ source + "</td><td>" + translation + "</td></tr>");	
	selection.text = source + " [" + translation + "]";
    }
});

control_panel.port.on('show_translation_history', function(){
    show_last_translations(prefs.translation_history_count);
});

control_panel.port.on('click', function(action){
    if (action == "toggle"){ 

	translation_on = !translation_on;
	translateWidget.contentURL = translation_on?data.url("disco-white.png"):data.url("disco-dark.png");
    }
    if (action == "show_webpage"){ 
	if(translation_on){
	    translation_scraper_panel.show()	
	}
    }
});

control_panel.on("show", function() {
    show_last_translations(5);
});

sp.on("reset_google", function() {
    prefs.translation_url = "http://translate.google.com/";
    prefs.translation_input = "#source";
    prefs.translation_output = "#result_box";
    resetScraper();
});

sp.on("reset_bing", function() {
    prefs.translation_url = "http://www.bing.com/translator/";
    prefs.translation_input = "#InputText";
    prefs.translation_output = "#TranslationOutput";
    resetScraper();

});


exports.main = function(options, callbacks) {
  // If you run cfx with --static-args='{"quitWhenDone":true}' this program
  // will automatically quit Firefox when it's done.
  if (options.staticArgs.quitWhenDone)
    callbacks.quit();
};
