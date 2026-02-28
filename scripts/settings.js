import { object_map_values,object_forEach,with_value } from "/scripts/utilities/functools.js";
import KeyboardUtilities from "/scripts/utilities/keyboard_utilities.js";
import DialogUtilities from "/scripts/ui/webdialog.js";
import SVGImporter from "/scripts/utilities/svgimporter.js";
import JSONDownloader from "/scripts/utilities/json_download.js";

let SettingsManager={
    settings: {
        "require_security": {
            type:"boolean",
            default:false,
            title:"Strict Security",
            description:`Require the use of secure connections (HTTPS/WSS).<br>
                         If enabled, the application will only connect to servers that support secure connections.<br>
                         NOTE: If your browser is using HTTPS, this setting will be forced to ON.`,
            force_value:location.protocol.indexOf('https:')!=-1
                        ? {value:true,tooltip:"Site opened via HTTPS. HTTPS sites can only connect to TLS secured servers."}
                        : null
        },
        "game_port": {
            type:"number",
            default:9001,
            title:"Game Port number",
            description:"Port number used when connecting to the &quot;Staging&quot;, &quot;Main Game&quot;, &quot;Game&quot; servers",
            range: {
                minimum:1,
                maximum:65535
            },
            force_value:null
        },
        "localhost_port": {
            type:"number",
            default:9003,
            title:"Testing Port number",
            description:"Port number used when connecting to the &quot;Testing&quot; server",
            range: {
                minimum:1,
                maximum:65535
            },
            force_value:null
        },
        "observer_key": {
            type:"number",
            title: "Observer key",
            description:"Observer key used to subscribe to the server",
            default:514525537,
            range:"unbound",
            force_value:null
        }
    }
}
SettingsManager.default_settings=object_map_values(SettingsManager.settings,(_key,setting)=>setting["default"]);

function write_settings_(json_settings,complete_handler) {
    function finish_ui(){
        document.getElementById("saving-cover-board").style.display="none";
    }
    document.getElementById("saving-cover-board").style.display="flex";
    setTimeout(()=>{
        let updated_settings=Object.assign(SettingsManager.read_settings_cookie(/*raw=*/true),json_settings);
        let cookie_value =JSON.stringify(updated_settings);
        localStorage.setItem("settings",cookie_value);
        let dialog;
        finish_ui();
        complete_handler();
    },10);
}

function dump_settings_() {
    let json_settings={};
    object_forEach(SettingsManager.settings,(key,setting)=>{
        if(!SettingsManager.is_value_forced(setting)){ // only store values that are not forced
            let source=document.getElementById(key+'_input');
            let source_property=setting.type=="boolean" ? "checked" : "value";
            let value=source[source_property];
            if(setting.type=="number")value=JSON.parse(value); //convert string to int
            json_settings[key]=value;
        }
    });
    return json_settings;
}

function write_displayed_settings_(complete_handler) {
    let json_settings=dump_settings_();
    write_settings_(json_settings,complete_handler);
}

function write_default_settings_(complete_handler) {
    write_settings_(SettingsManager.default_settings,complete_handler);
}

SettingsManager.export_settings=function() {
    let json_settings=dump_settings_();
    JSONDownloader.exportJSON(JSON.stringify(json_setings),"settings.json");
    alert("Settings exported to settings.json");
}

SettingsManager.import_settings=function() {
    let dialog=DialogUtilities.showDialog("After clicking OK, please select the settings.json file","Import Settings",null,[{text:"OK",action: ()=>{
        JSONDownloader.importJSON((json_string)=>{
            //confirmation dialog
            display_settings_(JSON.parse(json_string));
            DialogUtilities.showDialog('Settings imported successfully! Please verify and apply using the <svgfile src="/assets/ui/apply.svg"></svgfile> (Apply) button',"Import Settings");
        });
    }}]);
}

SettingsManager.ClickHandlers = {
    reset_settings_clicked: function() {
        DialogUtilities.showDialog("Are you sure you want to reset all settings to default? This will overwrite your current settings.","Reset Settings",null,[{"text":"OK","action":()=>{
            write_default_settings_(()=>{
                window.opener.location.reload();
                location.reload();
            });
        }},{text:"Cancel",action:null}]);
    },
    apply_clicked: function() {
        write_displayed_settings_(()=>{
            window.opener.location.reload();
        });
    },
    cancel_clicked: function() {
        window.close();
    },
    ok_clicked: function() {
        write_displayed_settings_(()=>{
            window.opener.location.reload();
            window.close();
        });
    }
}

SettingsManager.is_value_forced=function(setting){
    //HACK: use eval to defer parsing
    return (setting.force_value!=null) && eval(`typeof setting.force_value.value != "undefined"`);
}

SettingsManager.read_settings_cookie=function(raw) {
    let current_settings=Object.assign({},SettingsManager.default_settings);
    let cookie_value = localStorage.getItem("settings");
    if (cookie_value){
        let cookie=JSON.parse(cookie_value);
        current_settings=Object.assign(current_settings,cookie);
    }
    if (!raw){
        object_forEach(SettingsManager.settings,(name,setting)=>{
            if (SettingsManager.is_value_forced(setting)){
                current_settings[name]=setting.force_value.value;
            }
        });
    }
    return current_settings;
}
function display_settings_(json_settings) {
    object_forEach(json_settings,(key,value)=>{
        if(SettingsManager.settings.hasOwnProperty(key)){
            let destination=document.getElementById(key+'_input');
            let destination_property=SettingsManager.settings[key].type=="boolean" ? "checked" : "value"
            destination[destination_property]=value;
            update_reset_button_({key:key,value:value});
        }
    });
}
function populate_settings_(){
    const root_container=document.getElementById("settings-megacontainer");

    object_forEach(SettingsManager.settings,(key,setting)=>{
        let value_forced = SettingsManager.is_value_forced(setting);

        let setting_div=document.createElement("div");
        setting_div.classList.add("setting-container");
        setting_div.setAttribute("id",key);
        let text_container=document.createElement("label");
        text_container.classList.add("setting-text-container");
        text_container.setAttribute('for',key+'_input');
        let title=document.createElement("span");
        title.classList.add("setting-text-name");
        title.innerHTML=setting.title;
        text_container.appendChild(title);
        let description=document.createElement("p");
        description.classList.add("setting-text-description");
        description.innerHTML=setting.description;
        text_container.appendChild(description);
        setting_div.appendChild(text_container);

        let right_box=document.createElement("div");
        right_box.classList.add("settings-right-box");
        if(!value_forced) {
            let reset_button=document.createElement("a");
            let accessibility_text=`Reset the ${setting.title} setting to default`;
            reset_button.id=key+'_reset';
            reset_button.role="button";
            reset_button.setAttribute("title",accessibility_text);
            reset_button.addEventListener("click",(e)=>{
                e.preventDefault();
                reset_setting_(key);
            });
            reset_button.classList.add("reset-button");
            let reset_icon=document.createElement('svgfile');
            reset_icon.setAttribute("src","/assets/ui/reset.svg"); //src= cannot be used since it is not an image
            reset_icon.setAttribute("aria-hidden","true");
            reset_icon.alt=accessibility_text;
            reset_icon.title=accessibility_text;
            reset_icon.classList.add("reset-icon");
            reset_button.appendChild(reset_icon);
            right_box.appendChild(reset_button);
        }

        let input_element=document.createElement("input");
        switch(setting.type){
            case "boolean":
                input_element.type="checkbox";
                break;
            case "number":
                input_element.type="number";
                if(typeof setting.range=="object"){
                    input_element.min=setting.range.minimum;
                    input_element.max=setting.range.maximum;
                }
                break;
            case "setpicker":
                input_element=document.createElement("select");
                setting.range.forEach(option=>{
                    let option_element=document.createElement("option");
                    option_element.setAttribute("value",option.name);
                    option_element.innerHTML=option.display;
                    input_element.appendChild(option_element);
                });
                break;
            default:
                input_element.type="hidden"; // disable it
                break;
        }
        input_element.setAttribute("id",key+'_input');
        input_element.classList.add("setting-value");
        input_element.disabled=value_forced;
        if(value_forced)input_element.title=setting.force_value.tooltip;
        input_element.style.cursor=value_forced?"not-allowed":"default";
        input_element.addEventListener('change',(e)=>{
            let property=setting.type=="boolean"?"checked":"value";
            let update={key:key,value:e.target[property]};
            onChange_(update);
        })
        right_box.appendChild(input_element);
        setting_div.appendChild(right_box);
        root_container.appendChild(setting_div);
    });
    SVGImporter.reimport(); // reimport SVG files after the settings are populated
}

function update_reset_button_(setting_update){
    let show=setting_update.value!=SettingsManager.settings[setting_update.key].default; // true if the value is not equal to the default
    with_value(document.getElementById(setting_update.key+'_reset'),(reset_button)=>{
        if(reset_button)
            reset_button.style.display=show?"block":"none";
    });
}

function reset_setting_(setting_key){
    update_setting_(setting_key,SettingsManager.settings[setting_key].default);
}

SettingsManager.initialize_popup=function() {
    populate_settings_();
    let json_settings = SettingsManager.read_settings_cookie();
    display_settings_(json_settings);
    window.addEventListener("keydown", (event) => {
        if(KeyboardUtilities.isMnemonicPressed(event,false,'d')) {
            event.preventDefault();
            SettingsManager.ClickHandlers.reset_settings_clicked();
        } else if(KeyboardUtilities.isMnemonicPressed(event,false,'o')) {
            event.preventDefault();
            SettingsManager.ClickHandlers.ok_clicked();
        } else if(KeyboardUtilities.isMnemonicPressed(event,false,'a')) {
            event.preventDefault();
            SettingsManager.ClickHandlers.apply_clicked();
        } else if (event.key == "Escape" || (KeyboardUtilities.isMnemonicPressed(event,false,'c'))) {
            event.preventDefault();
            SettingsManager.ClickHandlers.cancel_clicked();
        } else if(KeyboardUtilities.isMnemonicPressed(event,true,'x')) {
            event.preventDefault();
            SettingsManager.export_settings();
        } else if(KeyboardUtilities.isMnemonicPressed(event,true,'m')) {
            event.preventDefault();
            SettingsManager.import_settings();
        }
    });
}
SettingsManager.initialize_main=function(){
    if (navigator.onLine) { // only add the listener if we are online
        window.addEventListener("keydown", (event) => {
            if (KeyboardUtilities.isMnemonicPressed(event,true,'c')) {
                SettingsManager.open_popup(); // weird Firefox browser error: popup blocker when triggered by non-mouse event (e.g. keyboard here)
                event.preventDefault();
            }
        });
    }
}

function onChange_(setting_update){
    update_reset_button_(setting_update);
}

function update_setting_(setting,value){
    let property=SettingsManager.settings[setting].type=="boolean"?"checked":"value";
    let element=document.getElementById(setting+"_input");
    element[property]=value;
    element.dispatchEvent(new Event("change"));//force the change handler to run
}

SettingsManager.open_popup=function() {
    // Position of popup
    let width = 700;
    let height = 600;
    let left = Math.floor((screen.width / 2) - (width / 2));
    let top = Math.floor((screen.height / 2) - (height / 2));
    return window.open('/settings.html', '',`popup=yes,width=${width},height=${height},left=${left},top=${top}`);
}

window.SettingsManager=SettingsManager; // make globally accessible
export default SettingsManager;