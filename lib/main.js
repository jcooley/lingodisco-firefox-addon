var self = require("sdk/self");
var data = self.data;
var selection = require("sdk/selection");
var simpleStorage = require("sdk/simple-storage");
var timers = require("sdk/timers");
var notify = require("sdk/notifications").notify;
var sp = require("sdk/simple-prefs");
var prefs = sp.prefs;
var cm = require("sdk/context-menu");
var _ = require("sdk/l10n").get;
var ui = require("sdk/ui");

var translation_on = false;

var workers = [];
function detachWorker(worker, workerArray) {
  var index = workerArray.indexOf(worker);
  if(index != -1) {
    workerArray.splice(index, 1);
  }
};

var { ActionButton } = require("sdk/ui/button/action");

// Create the persistent notes array if it doesn't already exist.  
simpleStorage.storage.gloss = simpleStorage.storage.gloss || [];

// TODO; test
simpleStorage.on("OverQuota", function () {
  while (ss.quotaUsage > 1)
      ss.storage.gloss.reverse().pop();
});

var control_panel = require("sdk/panel").Panel({
    contentURL: self.data.url("control_panel.html"),
    contentScriptFile: [data.url("jquery-1.7.2.js"), 
			data.url('onoffpanel.js')
		       ],
  onHide: handleHide
});

function handleHide() {
  translateWidget.state('window', {checked: false});
}

let translateWidget =  ActionButton({
    id: 'ocuile-aistrigh',
    label: "Translate",
    icon: data.url("disco-white.png"),
    // have to specify this or it gets lost for bigger values
    panel: control_panel,
    onClick: handleChange,
    onAttach: function(worker) {
	workers.push(worker);
	worker.on('detach', function () {
	    detachWorker(this, workers);
	});
    }
});

function handleChange(state) {
  console.log("handleChange "+state.checked);
    control_panel.show(
	{position: translateWidget}
    );
}			      


let translation_scraper_panel = require("sdk/panel").Panel({
    width: 800,
    height: 600,
    contentURL: prefs.translation_url,
    contentScriptFile: [data.url("jquery-1.7.2.js"),
			data.url("scraper.js")],
    contentScriptWhen: "end"
});



function reset_scraper(){
    if(translation_scraper_panel.contentURL != prefs.translation_url){
	translation_scraper_panel.contentURL = prefs.translation_url;
    }
    translation_scraper_panel.port.emit("setprefs", prefs.translation_input, prefs.translation_output);

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

function translate() {
    if (translation_on){
	// sanity check to take care for unwanted over selections
	if ((selection.text != selection.html) && (selection.text.length > prefs.translation_cutoff)){
	    notify({
		text: "There may a problem with the selection. Please try a shorter selection to try again",
	    });
	    return;
	}
	translation_scraper_panel.port.emit('translate', selection.text);
    }};

selection.on('select', translate);

translation_scraper_panel.port.on("translator_reload", function(text_to_translate) {
    reset_scraper();
    // retry the translation
    translation_scraper_panel.port.emit('translate', text_to_translate);
});

var ROW_START = "<tr><td>";

translation_scraper_panel.port.on('update_selection', function(source, translation){
    if (!translation_on){    
	console.log("trying to update selection when translation_on is off with " + translation);
	return;
    }

    if (selection.text){
	if (selection.text.startsWith(source)){
	    selection.text = source + " [" + translation + "]";
	}else{
	    return;
	}

	var gloss = simpleStorage.storage.gloss;
	var lastEntry = gloss.pop() || '';
	// as the translation is update on a word-by-word basis we need to check if we have added
	// a partial translation alreay
	if (lastEntry && !lastEntry.startsWith(ROW_START+source)){
	    gloss.push(lastEntry);
	}
	gloss.push(ROW_START+ source + "</td><td>" + translation + "</td></tr>");
	show_last_translations(prefs.translation_history_count);
    }
});

control_panel.port.on('show_translation_history', function(){
    show_last_translations(prefs.translation_history_count);
});


function update_content_script_state(){
    translateWidget.contentURL = translation_on?data.url("disco-white-redsquarecentre.png"):data.url("disco-white.png");
    if(translation_on){
	translation_scraper_panel.port.emit('start_translation_updates');	    
	control_panel.port.emit("switch_on");

    }else{
	translation_scraper_panel.port.emit('stop_translation_updates');	    
	control_panel.port.emit("switch_off");

    }
}

control_panel.port.on('click', function(action){
    if (action == "toggle"){ 
	translation_on = !translation_on;
	update_content_script_state();
    }
    if (action == "show_webpage"){ 
	if(translation_on){
	    translation_scraper_panel.show()	
	}
    }
});

sp.on("reset_google", function() {
    prefs.translation_url = "http://translate.google.com/";
    prefs.translation_input = "#source";
    prefs.translation_output = "#result_box";
    reset_scraper();
    translation_on = false;
    update_content_script_state();
});

sp.on("reset_bing", function() {
    prefs.translation_url = "http://www.bing.com/translator/";
    prefs.translation_input = "#InputText";
    prefs.translation_output = "#OutputText";
    reset_scraper();
    translation_on = false;
    update_content_script_state();

});

translation_scraper_panel.port.on("reset_scraper", function() {
    reset_scraper();
});

var rightClickItem = cm.Item({
  label: "LingoDisco",
  context: cm.SelectionContext(),
  contentScript: 'self.on("click", self.postMessage); self.on("context", function () { return "LingoDisco: " + window.getSelection().toString()});',
  onMessage: function () {
      if(!translation_on){
	  translation_on = !translation_on;
	  update_content_script_state(); 
	  rightClickOnOff.label = translation_on?"LingoDisco Disable":"LingoDisco Enable";
	  translate();
      }
  }
});

var rightClickOnOff = cm.Item({
  label: translation_on?"LingoDisco Disable":"LingoDisco Enable",
  contentScript: 'self.on("click", self.postMessage);',
  context: cm.PageContext(),
  onMessage: function () {
      translation_on = !translation_on;
      rightClickOnOff.label = translation_on?"LingoDisco Disable":"LingoDisco Enable",
      update_content_script_state(); 
  }
});



