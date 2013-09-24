var ENABLE = "Enable", DISABLE = "Disable", ON = "on", OFF = "off", isSwitchedOff = false;

self.port.on('translated', function(source_text){
    $('#translated').html( source_text);
    $("#translated td").css({"vertical-align": "top", "border": "solid thin"});    
    $("#buttons td").css({"border-bottom": "dotted thin", "padding-bottom": "4px"});    
});

self.port.on('localize_enable_disable', function(enable, disable, on, off){
    ENABLE = enable;
    DISABLE = disable;
    ON = on;
    OFF = off;
    $("#onoff").html(OFF);    
});

// Odd things can happen if you switch tranlation engines so this just resets things.
self.port.on('switch_off', function(){
    update_visible_state(false);
});

self.port.on('switch_on', function(){
    update_visible_state(true);
});

$(window).click(function (event) {
    var t = event.target;
    
    // Don't intercept the click if it isn't on a link.
    if (t.nodeName != "BUTTON")
	return;
    
    // Intercept the click, passing it to the addon, which will load it in a tab.
    event.stopPropagation();
    event.preventDefault();
    self.port.emit('click', t.name);

    if(t.name == 'toggle'){
	isSwitchedOff = !isSwitchedOff;
	update_visible_state(isSwitchedOff);
    }
});


function update_visible_state(isOff){
    console.log("toggle state " + isOff);
    $("#onoff").html(isOff?ON:OFF);    
    $("#toggle").html(isOff?DISABLE:ENABLE);    
    if(isOff){
	$("#display_translation_id").show();

    }else{
	$("#display_translation_id").hide();    
    }
    self.port.emit('show_translation_history');
}

// Panels have an OS-specific background color by default, and the Mac OS X
// background color is dark grey, but Reddit expects its background to be white
// and looks odd when it isn't, so set it to white.
$("body").css("background", "white");

$("document").ready(function () {
    self.port.emit('show_translation_history');
    $("#display_translation_id").hide();    
});
