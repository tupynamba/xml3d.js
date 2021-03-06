var XML3D = require("./global.js").XML3D;
var Config = require("./interface/elements.js").config;
var sendAdapterEvent = require("./utils/misc.js").sendAdapterEvent;
var Options = require("./utils/options.js");
var CSS = require("./utils/css.js");
var ConfigureRenderer = require("./renderer/renderer/configure.js");
var WebglSupported = require("./renderer/webgl/base/utils.js").supported;
var Util = require("./utils/misc.js");
require("./interface/dom.js");
require("./utils/debug.js");

(function () {
    if (navigator.userAgent.match(/(iPad|iPhone|iPod touch)/i)) {
        var m = document.createElement("meta");
        m.name = "format-detection";
        m.content = "telephone=no";
        document.head.appendChild(m)
    }
}());

function displayWebGLNotSupportedInfo(xml3dElement){

    if(xml3dElement.hasAttribute("onunsupported")){
        var callback = new Function("event", xml3dElement.getAttribute("onunsupported"));
        xml3dElement.addEventListener('unsupported', callback, false);
    }
    var doDefault = XML3D.util.dispatchCustomEvent(xml3dElement, 'unsupported', false, true, null);
    if(doDefault){
        // Place xml3dElement inside an invisible div
        var hideDiv = document.createElement('div');

        xml3dElement.parentNode.insertBefore(hideDiv, xml3dElement);
        hideDiv.appendChild(xml3dElement);
        //hideDiv.style.display = "none";

        var infoDiv = document.createElement('div');
        if(xml3dElement.hasAttribute("class")){
            infoDiv.setAttribute("class", xml3dElement.getAttribute("class"));
        }

        infoDiv.setAttribute("style", xml3dElement.getAttribute("style"));
        infoDiv.style.border = "2px solid red";
        infoDiv.style.fontFamily = "verdana,sans-serif";
        infoDiv.style.color = "red";
        infoDiv.style.padding = "10px";
        infoDiv.style.backgroundColor = "rgba(255, 0, 0, 0.3)";

        var width = xml3dElement.getAttribute("width");
        if (width !== null) {
            infoDiv.style.width = width;
        }

        var height = xml3dElement.getAttribute("height");
        if (height !== null) {
            infoDiv.style.height = height;
        }

        var hElement = document.createElement("h3");
        var hTxt = document.createTextNode("Sorry, your browser doesn't appear to support XML3D.");
        hElement.appendChild(hTxt);

        var pElement = document.createElement("p");
        pElement.appendChild(document.createTextNode("Please visit "));
        var link = document.createElement("a");
        link.setAttribute("href", "http://www.xml3d.org/help");
        link.appendChild(document.createTextNode("http://www.xml3d.org/help"));
        pElement.appendChild(link);
        pElement.appendChild(document.createTextNode(" for more information."));
        infoDiv.appendChild(hElement);
        infoDiv.appendChild(pElement);

        hideDiv.parentNode.insertBefore(infoDiv, hideDiv);
    }

}

/*  a list of elements that are currently initialized. More specifically,
 *  they're currently in a call to the method below.
 *
 *  Why?
 *  In webgl we actually reattach the xml3d element in the DOM. Thus, when
 *  we're in the middle of working on a node insertion event, there will probably
 *  come right another event which we actually don't care for.
 *  So we use this list to keep track of which elements are currently initializing.
 */
var curXML3DInitElements = [];

/**
 * @param {Element} xml3dElement
 */
function initXML3DElement(xml3dElement) {
    if(curXML3DInitElements.indexOf(xml3dElement) > -1)
        return;

    // Make sure the xml3d element is still in the DOM
    var parent = xml3dElement.parentNode;
    while (parent && !Util.elementIs(parent, "body")) {
        parent = parent.parentNode;
    }
    if (!parent || !Util.elementIs(parent, "body")) {
        return;
    }

    curXML3DInitElements.push(xml3dElement);

    var debug = XML3D.debug.setup();

    if (!WebglSupported()) {
        debug && XML3D.debug.logWarning("Could not initialise WebGL, sorry :-(");
        displayWebGLNotSupportedInfo(xml3dElement);
        curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
        return;
    }

    XML3D.debug.logInfo("Configuring", xml3dElement.querySelectorAll("*").length, "elements");

    try {
        Config.configure(xml3dElement);
    } catch (e) {
        debug && XML3D.debug.logException(e);
        curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
        return;
    }
    try {
        ConfigureRenderer(xml3dElement);
    } catch (e) {
        debug && XML3D.debug.logException(e);
        curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
        return;
    }

    // initialize all attached adapters
    sendAdapterEvent(xml3dElement, {onConfigured : []});

    curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
    clearObserver();
}

/**
 * @param {Element} xml3dElement
 */
function destroyXML3DElement(xml3dElement)
{
    if(curXML3DInitElements.indexOf(xml3dElement) > -1)
        return;

    if (!xml3dElement._configured) {
        return; //Already destroyed or never initialized
    }

    var canvas = xml3dElement._configured.canvas;

    xml3dElement._configured.destroy();
    xml3dElement._configured = undefined;

    if(!canvas || !Util.elementIs(canvas, "canvas"))
        return; // an element we didn't create, skip deletion

    if (!xml3dElement.parentNode) {
        // The xml3d element was removed directly rather than as a result of a parent container being removed,
        // here we should also remove the hiding div
        var div = canvas.nextElementSibling;
        if (Util.elementIs(div, "div") && div.getAttribute("class") == "_xml3d_hideDiv") {
            div.parentNode && div.parentNode.removeChild(div);
        }
    }

    canvas.parentNode && canvas.parentNode.removeChild(canvas);
}

var xml3dElementObserver = null;

function onLoad() {

    Options.setOptionsFromQuery();

    CSS.init();

    var debug = XML3D.debug.setup();
    debug && XML3D.debug.logInfo("xml3d.js version: " + XML3D.version);

    /**
     * Find all the XML3D tags in the document
     * @type {NodeList}
     */
    var xml3ds = document.querySelectorAll("xml3d");

    debug && XML3D.debug.logInfo("Found " + xml3ds.length + " xml3d node(s)");

    for(var i = 0; i < xml3ds.length; i++) {
        initXML3DElement(xml3ds[i]);
    }

    xml3dElementObserver = new MutationObserver(resolveMutations);
    xml3dElementObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: false} );
}

function onUnload() {
    if (XML3D.document)
        XML3D.document.onunload();
}



function resolveMutations(mutations){
    for(var i = 0; i < mutations.length; ++i){
        var mutation = mutations[i];
        if(mutation.type == 'childList'){
            mapFunctionOnXML3DElements(mutation.addedNodes, initXML3DElement);
            mapFunctionOnXML3DElements(mutation.removedNodes, destroyXML3DElement);

        }
    }
}

function mapFunctionOnXML3DElements(elementList, fun) {
    Array.forEach(elementList, function(element) {
        if (!element.getElementsByTagNameNS) {
            // These elements are leaf nodes (eg. TEXT) so we can ignore them
            return;
        }
        if (Util.elementIs(element, "xml3d")) {
            fun(element);
            // An XML3D element can't have further XML3D elements as children
            return;
        }
        // For cases where an XML3D element might be inside the subtree of the added node
        var xml3dElems = element.getElementsByTagName("xml3d");
        xml3dElems = xml3dElems.length ? xml3dElems : element.getElementsByTagNameNS(XML3D.xml3dNS, "xml3d");

        Array.forEach(xml3dElems, fun);
    });
}

XML3D.flushCSSChanges = function(){
    if (xml3dElementObserver) {
        resolveMutations(xml3dElementObserver.takeRecords());
    }
};

function clearObserver(){
    if (xml3dElementObserver) {
        xml3dElementObserver.takeRecords();
    }
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    onLoad();
} else {
    document.addEventListener('DOMContentLoaded', onLoad, false);
}

window.addEventListener('unload', onUnload, false);
window.addEventListener('reload', onUnload, false);

module.exports = XML3D;

